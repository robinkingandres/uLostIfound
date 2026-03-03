"""
AI Matching Service using TensorFlow Lite MobileNetV3 for image similarity
and text comparison heuristics.
"""

import os
from difflib import SequenceMatcher
from io import BytesIO
from typing import Any, Optional

from django.conf import settings

try:
    import numpy as np
except ImportError:
    np = None

try:
    from PIL import Image
except ImportError:
    Image = None

try:
    import requests
except ImportError:
    requests = None

try:
    from tflite_runtime.interpreter import Interpreter
    TFLITE_AVAILABLE = True
    TFLITE_BACKEND = "tflite_runtime"
except ImportError:
    try:
        import tensorflow as tf
        Interpreter = tf.lite.Interpreter
        TFLITE_AVAILABLE = True
        TFLITE_BACKEND = "tensorflow"
    except ImportError:
        Interpreter = None
        TFLITE_AVAILABLE = False
        TFLITE_BACKEND = None

MAX_ACTIVE_MATCH_SCORE = 85.0
DEFAULT_MOBILENETV3_MODEL_RELATIVE_PATH = os.path.join(
    "models", "mobilenet_v3_small_100_224_feature_vector.tflite"
)
MODEL_PATH_ENV_KEYS = (
    "AI_MATCH_TFLITE_MODEL_PATH",
    "TFLITE_MOBILENETV3_PATH",
    "AI_MATCH_MODEL_PATH",
)


class AIMatchingService:
    """Service for matching lost and found items using AI."""

    _instance = None
    _interpreter = None
    _input_details = None
    _output_details = None
    _model_path = None

    def __new__(cls):
        """Singleton pattern to avoid loading model multiple times."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        """Initialize model lazily."""
        pass

    def _normalize_embedding(self, features: Any):
        """Normalize an embedding and return a 1D numpy vector."""
        if np is None or features is None:
            return None
        try:
            vector = np.asarray(features, dtype=np.float32).reshape(-1)
            if vector.size == 0:
                return None
            norm = np.linalg.norm(vector)
            if norm <= 0:
                return None
            return vector / norm
        except Exception:
            return None

    def _resolve_model_path(self) -> str:
        """Resolve model path from env/settings/defaults."""
        configured_path = None
        for env_key in MODEL_PATH_ENV_KEYS:
            configured_path = os.environ.get(env_key)
            if configured_path:
                break

        if not configured_path:
            configured_path = getattr(settings, "AI_MATCH_TFLITE_MODEL_PATH", None)

        if not configured_path:
            configured_path = DEFAULT_MOBILENETV3_MODEL_RELATIVE_PATH

        if not os.path.isabs(configured_path):
            configured_path = os.path.join(str(settings.BASE_DIR), configured_path)

        return os.path.normpath(configured_path)

    def _load_model(self) -> bool:
        """Load TFLite MobileNetV3 model on first use."""
        if not TFLITE_AVAILABLE or np is None:
            return False

        if self._interpreter is not None:
            return True

        model_path = self._resolve_model_path()
        if not os.path.exists(model_path):
            print(
                "WARNING: TFLite MobileNetV3 model not found. "
                f"Expected at: {model_path}"
            )
            return False

        try:
            try:
                self._interpreter = Interpreter(model_path=model_path, num_threads=2)
            except TypeError:
                self._interpreter = Interpreter(model_path=model_path)

            self._interpreter.allocate_tensors()
            self._input_details = self._interpreter.get_input_details()
            self._output_details = self._interpreter.get_output_details()
            self._model_path = model_path
            print(f"TFLite model loaded via {TFLITE_BACKEND}: {model_path}")
            return True
        except Exception as e:
            print(f"Failed to load TFLite model: {e}")
            self._interpreter = None
            self._input_details = None
            self._output_details = None
            return False

    def _load_image(self, image_path_or_url: str) -> Any:
        """Load image from file path or URL."""
        if Image is None:
            return None
        try:
            if image_path_or_url.startswith(("http://", "https://")):
                if requests is None:
                    return None
                response = requests.get(image_path_or_url, timeout=10)
                response.raise_for_status()
                image = Image.open(BytesIO(response.content))
            else:
                # Handle relative paths from Django media
                if not os.path.isabs(image_path_or_url):
                    image_path_or_url = os.path.join(settings.MEDIA_ROOT, image_path_or_url)
                image = Image.open(image_path_or_url)

            # Convert to RGB if necessary
            if image.mode != "RGB":
                image = image.convert("RGB")

            return image
        except Exception as e:
            print(f"Failed to load image {image_path_or_url}: {e}")
            return None

    def _prepare_input_tensor(self, image: Any):
        """Prepare image tensor based on the model's input layout."""
        if np is None or self._input_details is None:
            return None, None

        input_detail = self._input_details[0]
        shape = input_detail.get("shape")
        if shape is None or len(shape) != 4:
            return None, None

        # Support both NHWC and NCHW input layouts.
        if int(shape[1]) in (1, 3) and int(shape[-1]) not in (1, 3):
            layout = "NCHW"
            height = int(shape[2]) if int(shape[2]) > 0 else 224
            width = int(shape[3]) if int(shape[3]) > 0 else 224
        else:
            layout = "NHWC"
            height = int(shape[1]) if int(shape[1]) > 0 else 224
            width = int(shape[2]) if int(shape[2]) > 0 else 224

        resized = image.resize((width, height), Image.BILINEAR)
        image_np = np.asarray(resized)

        if image_np.ndim == 2:
            image_np = np.stack([image_np, image_np, image_np], axis=-1)
        if image_np.shape[-1] == 4:
            image_np = image_np[:, :, :3]

        input_dtype = input_detail.get("dtype")
        if input_dtype == np.float32:
            # MobileNetV3 TFLite feature-vector models commonly expect [-1, 1].
            image_np = image_np.astype(np.float32)
            image_np = (image_np / 127.5) - 1.0
        elif np.issubdtype(input_dtype, np.integer):
            scale, zero_point = input_detail.get("quantization", (0.0, 0))
            if scale and scale > 0:
                normalized = (image_np.astype(np.float32) / 127.5) - 1.0
                quantized = np.round(normalized / scale + zero_point)
                dtype_info = np.iinfo(input_dtype)
                quantized = np.clip(quantized, dtype_info.min, dtype_info.max)
                image_np = quantized.astype(input_dtype)
            else:
                image_np = image_np.astype(input_dtype)
        else:
            image_np = image_np.astype(input_dtype)

        if layout == "NHWC":
            tensor = np.expand_dims(image_np, axis=0)
        else:
            tensor = np.expand_dims(np.transpose(image_np, (2, 0, 1)), axis=0)

        current_shape = tuple(int(x) for x in input_detail.get("shape", []))
        target_shape = tuple(int(x) for x in tensor.shape)
        if current_shape != target_shape:
            try:
                self._interpreter.resize_tensor_input(
                    input_detail["index"], list(target_shape), strict=False
                )
                self._interpreter.allocate_tensors()
                self._input_details = self._interpreter.get_input_details()
                self._output_details = self._interpreter.get_output_details()
                input_detail = self._input_details[0]
            except Exception:
                pass

        return tensor, input_detail

    def _dequantize_output(self, output_tensor, output_detail):
        """Convert quantized output to float32 when needed."""
        if np is None:
            return None

        scale, zero_point = output_detail.get("quantization", (0.0, 0))
        if scale and scale > 0:
            return scale * (output_tensor.astype(np.float32) - float(zero_point))
        return output_tensor.astype(np.float32)

    def get_image_embedding(self, image_path: str):
        """Get MobileNetV3 embedding for an image."""
        if np is None:
            return None
        if not self._load_model():
            return None

        image = self._load_image(image_path)
        if image is None:
            return None

        try:
            input_tensor, input_detail = self._prepare_input_tensor(image)
            if input_tensor is None or input_detail is None:
                return None

            self._interpreter.set_tensor(input_detail["index"], input_tensor)
            self._interpreter.invoke()
            output_detail = self._output_details[0]
            output_tensor = self._interpreter.get_tensor(output_detail["index"])
            embedding = self._dequantize_output(output_tensor, output_detail)
            return self._normalize_embedding(embedding)
        except Exception as e:
            print(f"Failed to get image embedding: {e}")
            return None

    def calculate_visual_similarity(self, image1_path: str, image2_path: str) -> float:
        """
        Calculate visual similarity between two images using MobileNetV3.
        Returns a score from 0 to 100.
        """
        if not image1_path or not image2_path:
            return 0.0

        emb1 = self.get_image_embedding(image1_path)
        emb2 = self.get_image_embedding(image2_path)

        if emb1 is None or emb2 is None:
            # Fallback: return a moderate score if images can't be compared
            return 50.0

        similarity = float(np.dot(emb1, emb2))
        score = (similarity + 1.0) * 50.0
        return min(100.0, max(0.0, score))

    def calculate_text_similarity(self, text1: str, text2: str) -> float:
        """
        Calculate text similarity with lexical heuristics.
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
