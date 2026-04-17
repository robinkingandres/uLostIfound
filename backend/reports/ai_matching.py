"""
AI matching service using MobileNet image embeddings + text/category heuristics.

Visual backend order:
1) torchvision MobileNetV3 (PyTorch)
2) transformers MobileNetV2 (Hugging Face)
3) tensorflow.keras MobileNetV3
4) filename similarity fallback
"""

from __future__ import annotations

import os
from difflib import SequenceMatcher
from io import BytesIO
from typing import Optional
from urllib.parse import urlparse
from urllib.request import urlopen

from django.db import IntegrityError

try:
    from PIL import Image
except Exception:  # pragma: no cover
    Image = None

try:
    import torch
except Exception:  # pragma: no cover
    torch = None

try:
    import numpy as np
except Exception:  # pragma: no cover
    np = None

MAX_ACTIVE_MATCH_SCORE = 85.0


def _notify_match_approved_once(match) -> None:
    """Send one-time notifications when a match becomes auto-approved."""
    from .models import Notification

    changed = []
    score_text = f"{float(match.match_score or 0.0):.1f}%"

    if not match.lost_reporter_notified:
        Notification.objects.create(
            recipient=match.lost_report.reporter,
            message=(
                f"Great news! A potential match has been found for your lost item "
                f"'{match.lost_report.item_name}'. Match confidence: {score_text}. "
                "Please check your Matches page for details."
            ),
            report=match.lost_report,
        )
        match.lost_reporter_notified = True
        changed.append("lost_reporter_notified")

    if not match.found_reporter_notified:
        Notification.objects.create(
            recipient=match.found_report.reporter,
            message=(
                f"Great news! The item you found '{match.found_report.item_name}' may belong "
                f"to someone. Match confidence: {score_text}. The system has auto-accepted this match."
            ),
            report=match.found_report,
        )
        match.found_reporter_notified = True
        changed.append("found_reporter_notified")

    if changed:
        match.save(update_fields=changed)


class AIMatchingService:
    """Service for matching lost and found items using MobileNet + heuristics."""

    _tv_loaded = False
    _tv_ready = False
    _tv_model = None
    _tv_transform = None

    _hf_loaded = False
    _hf_ready = False
    _hf_model = None
    _hf_processor = None

    _keras_loaded = False
    _keras_ready = False
    _keras_model = None

    def __init__(self):
        self.last_visual_backend = "fallback"

    @staticmethod
    def _safe_text(value: str | None) -> str:
        return (value or "").strip().lower()

    @staticmethod
    def _token_set(value: str | None) -> set[str]:
        text = AIMatchingService._safe_text(value)
        return {token for token in text.split() if token}

    def calculate_text_similarity(self, text1: str, text2: str) -> float:
        a = self._safe_text(text1)
        b = self._safe_text(text2)
        if not a or not b:
            return 0.0

        seq_ratio = SequenceMatcher(None, a, b).ratio()
        words1 = self._token_set(a)
        words2 = self._token_set(b)
        jaccard = (len(words1 & words2) / len(words1 | words2)) if words1 and words2 else 0.0

        combined = (seq_ratio * 55.0) + (jaccard * 45.0)
        return max(0.0, min(100.0, combined))

    def calculate_category_match(self, category1: str, category2: str) -> float:
        cat1 = self._safe_text(category1)
        cat2 = self._safe_text(category2)

        if not cat1 or not cat2:
            return 50.0
        if cat1 == cat2:
            return 100.0
        if cat1 in cat2 or cat2 in cat1:
            return 75.0

        similar_categories = {
            'phone': ['mobile', 'smartphone', 'cellphone', 'iphone', 'android'],
            'wallet': ['purse', 'billfold', 'card holder'],
            'keys': ['key', 'keychain'],
            'bag': ['backpack', 'handbag', 'satchel', 'tote'],
            'bottle': ['water bottle', 'tumbler', 'flask'],
            'laptop': ['computer', 'notebook', 'macbook'],
            'watch': ['smartwatch', 'wristwatch'],
            'glasses': ['eyeglasses', 'sunglasses', 'spectacles'],
            'headphones': ['earphones', 'earbuds', 'airpods'],
            'id': ['id card', 'school id', 'identification'],
        }

        for main_cat, variants in similar_categories.items():
            if (cat1 == main_cat or cat1 in variants) and (cat2 == main_cat or cat2 in variants):
                return 80.0

        return 0.0

    def calculate_visual_similarity(self, image1_path: str | None, image2_path: str | None) -> float:
        if not image1_path or not image2_path or Image is None:
            self.last_visual_backend = "fallback"
            return self._filename_similarity_fallback(image1_path, image2_path)

        emb1_t = self._get_embedding_torchvision(image1_path)
        emb2_t = self._get_embedding_torchvision(image2_path)
        if emb1_t is not None and emb2_t is not None and torch is not None:
            self.last_visual_backend = "mobilenetv3_torchvision"
            similarity = float(torch.dot(emb1_t, emb2_t).item())
            score = (similarity + 1.0) * 50.0
            return max(0.0, min(100.0, score))

        emb1_h = self._get_embedding_hf(image1_path)
        emb2_h = self._get_embedding_hf(image2_path)
        if emb1_h is not None and emb2_h is not None and torch is not None:
            self.last_visual_backend = "mobilenetv2_transformers"
            similarity = float(torch.dot(emb1_h, emb2_h).item())
            score = (similarity + 1.0) * 50.0
            return max(0.0, min(100.0, score))

        emb1_k = self._get_embedding_keras(image1_path)
        emb2_k = self._get_embedding_keras(image2_path)
        if emb1_k is not None and emb2_k is not None and np is not None:
            self.last_visual_backend = "mobilenetv3_keras"
            similarity = float(np.dot(emb1_k, emb2_k))
            score = (similarity + 1.0) * 50.0
            return max(0.0, min(100.0, score))

        self.last_visual_backend = "fallback"
        return self._filename_similarity_fallback(image1_path, image2_path)

    def _filename_similarity_fallback(self, image1_path: str | None, image2_path: str | None) -> float:
        # Keep fallback intentionally conservative so filename likeness
        # cannot dominate matching when real vision embeddings are unavailable.
        if not image1_path or not image2_path:
            return 20.0
        name1 = os.path.basename(str(image1_path)).lower()
        name2 = os.path.basename(str(image2_path)).lower()
        if not name1 or not name2:
            return 20.0
        ratio = SequenceMatcher(None, name1, name2).ratio()
        return max(10.0, min(35.0, ratio * 100.0))

    @classmethod
    def _load_torchvision_once(cls) -> bool:
        if cls._tv_loaded:
            return cls._tv_ready
        cls._tv_loaded = True

        if torch is None:
            cls._tv_ready = False
            return False

        try:
            from torchvision.models import MobileNet_V3_Small_Weights, mobilenet_v3_small

            weights = MobileNet_V3_Small_Weights.DEFAULT
            model = mobilenet_v3_small(weights=weights)
            model.eval()

            cls._tv_model = model
            cls._tv_transform = weights.transforms()
            cls._tv_ready = True
        except Exception:
            cls._tv_ready = False
        return cls._tv_ready

    @classmethod
    def _load_hf_once(cls) -> bool:
        if cls._hf_loaded:
            return cls._hf_ready
        cls._hf_loaded = True

        if torch is None:
            cls._hf_ready = False
            return False

        try:
            from transformers import AutoImageProcessor, MobileNetV2Model

            model_id = "google/mobilenet_v2_1.0_224"
            cls._hf_processor = AutoImageProcessor.from_pretrained(model_id)
            cls._hf_model = MobileNetV2Model.from_pretrained(model_id)
            cls._hf_model.eval()
            cls._hf_ready = True
        except Exception:
            cls._hf_ready = False
        return cls._hf_ready

    @classmethod
    def _load_keras_once(cls) -> bool:
        if cls._keras_loaded:
            return cls._keras_ready
        cls._keras_loaded = True

        if np is None:
            cls._keras_ready = False
            return False

        try:
            from tensorflow.keras.applications import MobileNetV3Small

            cls._keras_model = MobileNetV3Small(weights="imagenet", include_top=False, pooling="avg")
            cls._keras_ready = True
        except Exception:
            cls._keras_ready = False
        return cls._keras_ready

    def _resolve_media_path(self, image_path: str) -> str:
        if os.path.isabs(image_path):
            return image_path
        from django.conf import settings
        return os.path.join(settings.MEDIA_ROOT, image_path)

    def _open_image_rgb(self, image_path: str):
        """
        Open an image from either:
        - absolute/local filesystem path
        - Django default storage key (e.g., Cloudinary-backed media path)
        - http/https URL
        Returns a detached RGB PIL Image copy, or None on failure.
        """
        if Image is None or not image_path:
            return None
        try:
            parsed = urlparse(str(image_path))
            if parsed.scheme in ("http", "https"):
                with urlopen(str(image_path), timeout=15) as resp:
                    data = resp.read()
                with Image.open(BytesIO(data)) as image:
                    return image.convert("RGB").copy()

            from django.core.files.storage import default_storage

            if default_storage.exists(image_path):
                with default_storage.open(image_path, "rb") as handle:
                    with Image.open(handle) as image:
                        return image.convert("RGB").copy()

            resolved = self._resolve_media_path(image_path)
            with Image.open(resolved) as image:
                return image.convert("RGB").copy()
        except Exception:
            return None

    def _get_embedding_torchvision(self, image_path: str):
        if not self._load_torchvision_once() or Image is None or torch is None:
            return None
        try:
            image = self._open_image_rgb(image_path)
            if image is None:
                return None
            tensor = self._tv_transform(image).unsqueeze(0)

            with torch.no_grad():
                feats = self._tv_model.features(tensor)
                pooled = torch.nn.functional.adaptive_avg_pool2d(feats, 1).flatten(1).squeeze(0)
                norm = torch.norm(pooled, p=2)
                if norm == 0:
                    return None
                return pooled / norm
        except Exception:
            return None

    def _get_embedding_hf(self, image_path: str):
        if not self._load_hf_once() or Image is None or torch is None:
            return None
        try:
            image = self._open_image_rgb(image_path)
            if image is None:
                return None
            inputs = self._hf_processor(images=image, return_tensors="pt")

            with torch.no_grad():
                output = self._hf_model(**inputs)
                pooled = output.pooler_output.squeeze(0)
                norm = torch.norm(pooled, p=2)
                if norm == 0:
                    return None
                return pooled / norm
        except Exception:
            return None

    def _get_embedding_keras(self, image_path: str):
        if not self._load_keras_once() or Image is None or np is None:
            return None
        try:
            from tensorflow.keras.applications.mobilenet_v3 import preprocess_input

            image = self._open_image_rgb(image_path)
            if image is None:
                return None
            image = image.resize((224, 224))
            arr = np.asarray(image, dtype=np.float32)

            batch = np.expand_dims(arr, axis=0)
            batch = preprocess_input(batch)
            feats = self._keras_model.predict(batch, verbose=0)
            vec = feats.reshape(-1).astype(np.float32)
            norm = np.linalg.norm(vec)
            if norm == 0:
                return None
            return vec / norm
        except Exception:
            return None

    def calculate_match_score(self, lost_report, found_report) -> dict:
        lost_image = str(lost_report.image) if lost_report.image else None
        found_image = str(found_report.image) if found_report.image else None

        visual_score = self.calculate_visual_similarity(lost_image, found_image)

        lost_text = f"{lost_report.item_name} {lost_report.description}"
        found_text = f"{found_report.item_name} {found_report.description}"

        text_score = self.calculate_text_similarity(lost_text, found_text)
        name_score = self.calculate_text_similarity(lost_report.item_name, found_report.item_name)
        category_score = self.calculate_category_match(lost_report.category, found_report.category)
        location_score = self.calculate_text_similarity(lost_report.location or '', found_report.location or '')

        # Image-driven weighting:
        # - visual: 70%
        # - item name: 15%
        # - text description: 10%
        # - location: 5%
        match_score = (
            (visual_score * 0.70)
            + (name_score * 0.15)
            + (text_score * 0.10)
            + (location_score * 0.05)
        )

        # Hard gate: when both reports have images, require strong visual similarity.
        # This prevents text/name agreement from matching clearly different objects.
        if lost_image and found_image and visual_score < 80.0:
            match_score = 0.0

        active_match_score = min(float(match_score), MAX_ACTIVE_MATCH_SCORE)
        return {
            'visual_score': round(visual_score, 1),
            'text_score': round(text_score, 1),
            'match_score': round(active_match_score, 1),
            'visual_backend': self.last_visual_backend,
        }


def find_potential_matches_for_report(report_id: int, min_score: Optional[float] = None):
    """Find potential matches for a single report against opposite-type reports."""
    from .models import AIMatch, Report
    from users.models import SiteSettings

    settings_obj = SiteSettings.get_solo()
    if not settings_obj.ai_matching_enabled:
        return []

    if min_score is None:
        min_score = float(settings_obj.ai_min_score)  
    min_score = min(float(min_score), MAX_ACTIVE_MATCH_SCORE)

    try:
        report = Report.objects.get(id=report_id)
    except Report.DoesNotExist:
        return []

    if report.type not in ['Lost', 'Found']:
        return []
    if report.status not in ['Pending', 'Verified']:
        return []

    service = AIMatchingService()
    new_matches = []

    if report.type == 'Lost':
        candidate_reports = Report.objects.filter(type='Found', status__in=['Pending', 'Verified']).exclude(id=report.id)
        for candidate in candidate_reports:
            scores = service.calculate_match_score(report, candidate)
            existing = AIMatch.objects.filter(lost_report=report, found_report=candidate).first()

            if existing:
                # Auto-accept mode:
                # - remove stale low-score matches
                # - keep qualifying matches approved
                if scores['match_score'] < min_score:
                    existing.delete()
                    continue
                existing.visual_score = scores['visual_score']
                existing.text_score = scores['text_score']
                existing.match_score = scores['match_score']
                existing.status = 'Approved'
                existing.save(update_fields=['visual_score', 'text_score', 'match_score', 'status', 'date_updated'])
                _notify_match_approved_once(existing)
                continue

            if scores['match_score'] >= min_score:
                try:
                    match, created = AIMatch.objects.get_or_create(
                        lost_report=report,
                        found_report=candidate,
                        defaults={
                            'visual_score': scores['visual_score'],
                            'text_score': scores['text_score'],
                            'match_score': scores['match_score'],
                            'status': 'Approved',
                        },
                    )
                    if created:
                        _notify_match_approved_once(match)
                        new_matches.append(match)
                    else:
                        # Rare race condition fallback: enforce auto-approved state.
                        updates = []
                        if match.status != 'Approved':
                            match.status = 'Approved'
                            updates.append('status')
                        if match.visual_score != scores['visual_score']:
                            match.visual_score = scores['visual_score']
                            updates.append('visual_score')
                        if match.text_score != scores['text_score']:
                            match.text_score = scores['text_score']
                            updates.append('text_score')
                        if match.match_score != scores['match_score']:
                            match.match_score = scores['match_score']
                            updates.append('match_score')
                        if updates:
                            updates.append('date_updated')
                            match.save(update_fields=updates)
                        _notify_match_approved_once(match)
                except IntegrityError:
                    continue
    else:
        candidate_reports = Report.objects.filter(type='Lost', status__in=['Pending', 'Verified']).exclude(id=report.id)
        for candidate in candidate_reports:
            scores = service.calculate_match_score(candidate, report)
            existing = AIMatch.objects.filter(lost_report=candidate, found_report=report).first()

            if existing:
                if scores['match_score'] < min_score:
                    existing.delete()
                    continue
                existing.visual_score = scores['visual_score']
                existing.text_score = scores['text_score']
                existing.match_score = scores['match_score']
                existing.status = 'Approved'
                existing.save(update_fields=['visual_score', 'text_score', 'match_score', 'status', 'date_updated'])
                _notify_match_approved_once(existing)
                continue

            if scores['match_score'] >= min_score:
                try:
                    match, created = AIMatch.objects.get_or_create(
                        lost_report=candidate,
                        found_report=report,
                        defaults={
                            'visual_score': scores['visual_score'],
                            'text_score': scores['text_score'],
                            'match_score': scores['match_score'],
                            'status': 'Approved',
                        },
                    )
                    if created:
                        _notify_match_approved_once(match)
                        new_matches.append(match)
                    else:
                        updates = []
                        if match.status != 'Approved':
                            match.status = 'Approved'
                            updates.append('status')
                        if match.visual_score != scores['visual_score']:
                            match.visual_score = scores['visual_score']
                            updates.append('visual_score')
                        if match.text_score != scores['text_score']:
                            match.text_score = scores['text_score']
                            updates.append('text_score')
                        if match.match_score != scores['match_score']:
                            match.match_score = scores['match_score']
                            updates.append('match_score')
                        if updates:
                            updates.append('date_updated')
                            match.save(update_fields=updates)
                        _notify_match_approved_once(match)
                except IntegrityError:
                    continue

    return new_matches


def find_potential_matches_all(min_score: Optional[float] = None):
    """Find potential matches between all active Lost/Found reports."""
    from .models import Report
    from users.models import SiteSettings

    settings_obj = SiteSettings.get_solo()
    if not settings_obj.ai_matching_enabled:
        return []

    if min_score is None:
        min_score = float(settings_obj.ai_min_score)
    min_score = min(float(min_score), MAX_ACTIVE_MATCH_SCORE)

    report_ids = list(
        Report.objects.filter(type__in=['Lost', 'Found'], status__in=['Pending', 'Verified']).values_list('id', flat=True)
    )

    created_matches = []
    for rid in report_ids:
        created_matches.extend(find_potential_matches_for_report(rid, min_score=min_score))
    return created_matches


def find_potential_matches(min_score: Optional[float] = None):
    """Compatibility wrapper."""
    return find_potential_matches_all(min_score=min_score)


def process_new_report(report):
    """Process a newly created report and find potential matches."""
    return find_potential_matches_for_report(report.id)
