"""
AI Matching Service using CLIP for image similarity and text comparison.
This service compares Lost and Found reports to find potential matches.
"""

import os
from typing import Any, Optional

try:
    import numpy as np
except ImportError:
    np = None

try:
    from PIL import Image
except ImportError:
    Image = None
from io import BytesIO
try:
    import requests
except ImportError:
    requests = None
from difflib import SequenceMatcher
from django.conf import settings

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    torch = None
    TORCH_AVAILABLE = False

# CLIP imports - LAZY LOADING SETUP
# We assume CLIP is available if Torch is, but we won't import transformers yet
# to prevent server timeout during startup.
CLIP_AVAILABLE = TORCH_AVAILABLE

MAX_ACTIVE_MATCH_SCORE = 85.0


class AIMatchingService:
    """Service for matching lost and found items using AI."""
    
    _instance = None
    _model = None
    _processor = None
    
    def __new__(cls):
        """Singleton pattern to avoid loading model multiple times."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize CLIP model lazily."""
        pass

    def _normalize_embedding(self, features):
        """
        Normalize a tensor-like embedding and return a 1D numpy vector.
        Handles variant output shapes and protects against zero norm.
        """
        if torch is None:
            return None
        if features is None:
            return None
        if not hasattr(features, "dim"):
            return None
        if features.dim() == 1:
            features = features.unsqueeze(0)
        norms = features.norm(dim=-1, keepdim=True)
        norms = torch.where(norms == 0, torch.ones_like(norms), norms)
        features = features / norms
        return features.detach().cpu().numpy().flatten()
    
    def _load_model(self):
        """Load CLIP model on first use."""
        if not CLIP_AVAILABLE:
            return False
            
        if self._model is None:
            try:
                # --- LAZY IMPORT FIX ---
                print("Loading AI Engine (Transformers)...")
                from transformers import CLIPProcessor, CLIPModel
                
                # Use a smaller CLIP model for faster inference
                model_name = "openai/clip-vit-base-patch32"
                self._model = CLIPModel.from_pretrained(model_name)
                self._processor = CLIPProcessor.from_pretrained(model_name)
                
                # Move to GPU if available
                if torch.cuda.is_available():
                    self._model = self._model.to('cuda')
                    
                self._model.eval()
                print(f"CLIP model loaded: {model_name}")
                return True
            except ImportError:
                print("WARNING: transformers library not found. Install it for image matching.")
                return False
            except Exception as e:
                print(f"Failed to load CLIP model: {e}")
                return False
        return True
    
    def _load_image(self, image_path_or_url: str) -> Any:
        """Load image from file path or URL."""
        if Image is None:
            return None
        try:
            if image_path_or_url.startswith(('http://', 'https://')):
                if requests is None:
                    return None
                response = requests.get(image_path_or_url, timeout=10)
                image = Image.open(BytesIO(response.content))
            else:
                # Handle relative paths from Django media
                if not os.path.isabs(image_path_or_url):
                    image_path_or_url = os.path.join(settings.MEDIA_ROOT, image_path_or_url)
                image = Image.open(image_path_or_url)
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            return image
        except Exception as e:
            print(f"Failed to load image {image_path_or_url}: {e}")
            return None
    
    def get_image_embedding(self, image_path: str):
        """Get CLIP embedding for an image."""
        if np is None:
            return None
        if not self._load_model():
            return None
            
        image = self._load_image(image_path)
        if image is None:
            return None
        
        try:
            inputs = self._processor(images=image, return_tensors="pt")
            
            if torch.cuda.is_available():
                inputs = {k: v.to('cuda') for k, v in inputs.items()}
            
            with torch.no_grad():
                image_features = None
                if hasattr(self._model, 'get_image_features'):
                    image_kwargs = {}
                    if 'pixel_values' in inputs:
                        image_kwargs['pixel_values'] = inputs['pixel_values']
                    if image_kwargs:
                        image_features = self._model.get_image_features(**image_kwargs)
                if image_features is None:
                    output = self._model(**inputs)
                    if hasattr(output, 'image_embeds') and output.image_embeds is not None:
                        image_features = output.image_embeds
            return self._normalize_embedding(image_features)
        except Exception as e:
            print(f"Failed to get image embedding: {e}")
            return None
    
    def get_text_embedding(self, text: str):
        """Get CLIP embedding for text."""
        if np is None:
            return None
        if not self._load_model():
            return None
        
        try:
            inputs = self._processor(text=[text], return_tensors="pt", padding=True, truncation=True)
            
            if torch.cuda.is_available():
                inputs = {k: v.to('cuda') for k, v in inputs.items()}
            
            with torch.no_grad():
                text_features = None
                if hasattr(self._model, 'get_text_features'):
                    text_kwargs = {}
                    if 'input_ids' in inputs:
                        text_kwargs['input_ids'] = inputs['input_ids']
                    if 'attention_mask' in inputs:
                        text_kwargs['attention_mask'] = inputs['attention_mask']
                    if text_kwargs:
                        text_features = self._model.get_text_features(**text_kwargs)
                if text_features is None:
                    output = self._model(**inputs)
                    if hasattr(output, 'text_embeds') and output.text_embeds is not None:
                        text_features = output.text_embeds
                    elif hasattr(output, 'pooler_output') and output.pooler_output is not None:
                        text_features = output.pooler_output
            return self._normalize_embedding(text_features)
        except Exception as e:
            print(f"Failed to get text embedding: {e}")
            return None
    
    def calculate_visual_similarity(self, image1_path: str, image2_path: str) -> float:
        """
        Calculate visual similarity between two images using CLIP.
        Returns a score from 0 to 100.
        """
        if not image1_path or not image2_path:
            return 0.0
        
        emb1 = self.get_image_embedding(image1_path)
        emb2 = self.get_image_embedding(image2_path)
        
        if emb1 is None or emb2 is None:
            # Fallback: return a moderate score if images can't be compared
            return 50.0
        
        # Cosine similarity
        similarity = np.dot(emb1, emb2)
        # Convert from [-1, 1] to [0, 100]
        score = (similarity + 1) * 50
        return min(100, max(0, score))
    
    def calculate_text_similarity(self, text1: str, text2: str) -> float:
        """
        Calculate text similarity using multiple methods.
        Returns a score from 0 to 100.
        """
        if not text1 or not text2:
            return 0.0
        
        text1_lower = text1.lower().strip()
        text2_lower = text2.lower().strip()
        
        # Method 1: Sequence matching (basic)
        seq_ratio = SequenceMatcher(None, text1_lower, text2_lower).ratio()
        
        # Method 2: Word overlap (Jaccard similarity)
        words1 = set(text1_lower.split())
        words2 = set(text2_lower.split())
        
        if words1 and words2:
            intersection = words1.intersection(words2)
            union = words1.union(words2)
            jaccard = len(intersection) / len(union) if union else 0
        else:
            jaccard = 0
        
        # Method 3: CLIP text embeddings (if available)
        clip_score = 0
        if CLIP_AVAILABLE and np is not None:
            emb1 = self.get_text_embedding(text1)
            emb2 = self.get_text_embedding(text2)
            if emb1 is not None and emb2 is not None:
                similarity = np.dot(emb1, emb2)
                clip_score = (similarity + 1) * 50
        
        # Weighted combination
        if CLIP_AVAILABLE and clip_score > 0:
            # If CLIP is available, give it more weight
            combined = (seq_ratio * 20) + (jaccard * 30) + (clip_score * 0.5)
        else:
            # Fallback to basic methods
            combined = (seq_ratio * 50) + (jaccard * 50)
        
        return min(100, max(0, combined))
    
    def calculate_category_match(self, category1: str, category2: str) -> float:
        """
        Check if categories match.
        Returns 100 if exact match, 50 if similar, 0 if different.
        """
        if not category1 or not category2:
            return 50.0  # Unknown
        
        cat1 = category1.lower().strip()
        cat2 = category2.lower().strip()
        
        if cat1 == cat2:
            return 100.0
        
        # Check for partial match
        if cat1 in cat2 or cat2 in cat1:
            return 75.0
        
        # Similar categories mapping
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
    
    def calculate_match_score(self, lost_report, found_report) -> dict:
        """
        Calculate overall match score between a lost and found report.
        Returns a dictionary with visual_score, text_score, and match_score.
        """
        # Get image paths
        lost_image = str(lost_report.image) if lost_report.image else None
        found_image = str(found_report.image) if found_report.image else None
        
        # Calculate individual scores
        visual_score = self.calculate_visual_similarity(lost_image, found_image)
        
        # Combine item name and description for text comparison
        lost_text = f"{lost_report.item_name} {lost_report.description}"
        found_text = f"{found_report.item_name} {found_report.description}"
        text_score = self.calculate_text_similarity(lost_text, found_text)
        name_score = self.calculate_text_similarity(lost_report.item_name, found_report.item_name)
        
        # Category bonus
        category_score = self.calculate_category_match(lost_report.category, found_report.category)
        location_score = self.calculate_text_similarity(lost_report.location or '', found_report.location or '')
        
        # Calculate weighted overall score
        # Visual: 35%, text+name: 50%, category+location: 15%
        if lost_image and found_image:
            match_score = (
                (visual_score * 0.35)
                + (text_score * 0.30)
                + (name_score * 0.20)
                + (category_score * 0.10)
                + (location_score * 0.05)
            )
        else:
            # If images are unavailable, rely on text, item-name and category/location consistency.
            match_score = (
                (text_score * 0.45)
                + (name_score * 0.35)
                + (category_score * 0.15)
                + (location_score * 0.05)
            )

        # Heuristic floors to avoid under-scoring obvious same-item reports.
        if category_score >= 80 and name_score >= 65:
            match_score = max(match_score, 78.0)
        if category_score == 100 and name_score >= 80:
            match_score = max(match_score, 84.0)

        active_match_score = min(float(match_score), MAX_ACTIVE_MATCH_SCORE)
        return {
            'visual_score': round(visual_score, 1),
            'text_score': round(text_score, 1),
            'match_score': round(active_match_score, 1),
        }


def find_potential_matches_for_report(report_id: int, min_score: Optional[float] = None):
    """
    Find potential matches for a single report against opposite-type reports.
    Returns the list of newly created AIMatch rows.
    """
    from .models import Report, AIMatch
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
            if AIMatch.objects.filter(lost_report=report, found_report=candidate).exists():
                continue
            scores = service.calculate_match_score(report, candidate)
            if scores['match_score'] >= min_score:
                new_matches.append(
                    AIMatch.objects.create(
                        lost_report=report,
                        found_report=candidate,
                        visual_score=scores['visual_score'],
                        text_score=scores['text_score'],
                        match_score=scores['match_score'],
                        status='Pending',
                    )
                )
    else:
        candidate_reports = Report.objects.filter(type='Lost', status__in=['Pending', 'Verified']).exclude(id=report.id)
        for candidate in candidate_reports:
            if AIMatch.objects.filter(lost_report=candidate, found_report=report).exists():
                continue
            scores = service.calculate_match_score(candidate, report)
            if scores['match_score'] >= min_score:
                new_matches.append(
                    AIMatch.objects.create(
                        lost_report=candidate,
                        found_report=report,
                        visual_score=scores['visual_score'],
                        text_score=scores['text_score'],
                        match_score=scores['match_score'],
                        status='Pending',
                    )
                )

    return new_matches


def find_potential_matches_all(min_score: Optional[float] = None):
    """
    Find potential matches between all active Lost/Found reports.
    Returns the list of newly created AIMatch rows.
    """
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
    """
    Find potential matches between all Lost and Found reports.
    Creates AIMatch entries for pairs above the minimum score threshold.
    """
    return find_potential_matches_all(min_score=min_score)


def process_new_report(report):
    """
    Process a newly created report and find potential matches.
    Called when a new Lost or Found report is created.
    """
    return find_potential_matches_for_report(report.id)