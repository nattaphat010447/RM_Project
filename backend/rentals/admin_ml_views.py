from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import ABTestVariant, ABTestEvent, ModelTrainingLog, ModelConfig
from .permissions import IsAdminRole
from .ab_testing import ABTestManager
import subprocess
import threading
import os

# ============================================
# A/B Testing Views
# ============================================

@api_view(['GET', 'POST', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated, IsAdminRole])
def ab_test_variants(request):
    """
    Manage A/B test variants
    GET: List all variants
    POST: Create new variant
    PUT: Update variant (id in body)
    DELETE: Delete variant (id in query param)
    """
    if request.method == 'GET':
        variants = ABTestVariant.objects.all().order_by('-created_at')
        data = []
        for v in variants:
            data.append({
                'id': v.id,
                'name': v.name,
                'algorithm': v.algorithm,
                'traffic_percentage': float(v.traffic_percentage),
                'is_active': v.is_active,
                'description': v.description,
                'created_at': v.created_at,
                'updated_at': v.updated_at,
            })
        return Response({'variants': data})

    elif request.method == 'POST':
        name = request.data.get('name')
        algorithm = request.data.get('algorithm')
        traffic_percentage = request.data.get('traffic_percentage', 0)
        description = request.data.get('description', '')
        is_active = request.data.get('is_active', True)

        if not name or not algorithm:
            return Response({"error": "name and algorithm are required."}, status=400)

        try:
            variant = ABTestVariant.objects.create(
                name=name,
                algorithm=algorithm,
                traffic_percentage=traffic_percentage,
                description=description,
                is_active=is_active
            )
            return Response({
                "message": "Variant created.",
                "id": variant.id
            }, status=201)
        except Exception as e:
            return Response({"error": str(e)}, status=400)

    elif request.method == 'PUT':
        variant_id = request.data.get('id')
        if not variant_id:
            return Response({"error": "id is required."}, status=400)

        variant = get_object_or_404(ABTestVariant, id=variant_id)

        variant.name = request.data.get('name', variant.name)
        variant.algorithm = request.data.get('algorithm', variant.algorithm)
        variant.traffic_percentage = request.data.get('traffic_percentage', variant.traffic_percentage)
        variant.description = request.data.get('description', variant.description)
        variant.is_active = request.data.get('is_active', variant.is_active)
        variant.save()

        return Response({"message": "Variant updated."})

    elif request.method == 'DELETE':
        variant_id = request.query_params.get('id')
        if not variant_id:
            return Response({"error": "id is required."}, status=400)

        variant = get_object_or_404(ABTestVariant, id=variant_id)
        variant.delete()

        return Response({"message": "Variant deleted."})


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminRole])
def ab_test_metrics(request):
    """
    Get A/B test metrics for all variants
    """
    metrics = ABTestManager.get_all_variants_metrics()
    return Response({'metrics': metrics})


# ============================================
# Model Training Views
# ============================================

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminRole])
def trigger_model_retrain(request):
    """
    Trigger model retraining in background.

    Query params:
        model: 'v1' (default, 2 behaviors) or 'v2' (3 behaviors)
    """
    model_version = request.query_params.get('model', 'v1')

    if model_version not in ['v1', 'v2']:
        return Response({"error": "model must be 'v1' or 'v2'."}, status=400)

    # Check if there's already a training in progress
    running = ModelTrainingLog.objects.filter(status='RUNNING').exists()
    if running:
        return Response({
            "error": "A training job is already running. Please wait."
        }, status=400)

    model_name = 'MB-CGCN' if model_version == 'v1' else 'MB-CGCN-v2'

    # Create training log
    log = ModelTrainingLog.objects.create(
        model_name=model_name,
        status='PENDING'
    )

    # Start training in background thread
    def run_training():
        import os
        import sys

        # In Docker: /app is backend directory, ml_model is copied to /app/ml_model
        # In Local: backend is a subdirectory, need to go up to project root
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

        # Check if ml_model exists in current directory (Docker case)
        if os.path.exists(os.path.join(backend_dir, 'ml_model')):
            project_root = backend_dir
        else:
            # Local case: go up one more level
            project_root = os.path.dirname(backend_dir)

        if model_version == 'v1':
            script_path = os.path.join(project_root, 'ml_model', 'scripts', 'retrain_model.py')
        else:
            script_path = os.path.join(project_root, 'ml_model', 'scripts', 'retrain_model_v2.py')

        # Verify script exists
        if not os.path.exists(script_path):
            log.status = 'FAILED'
            log.error_message = f'Training script not found: {script_path}'
            log.completed_at = timezone.now()
            log.save()
            return

        log.metadata = log.metadata or {}
        log.metadata['script_path'] = str(script_path)
        log.metadata['project_root'] = str(project_root)
        log.save()

        try:
            result = subprocess.run(
                [sys.executable, script_path],
                cwd=str(project_root),
                capture_output=True,
                text=True,
                timeout=3600  # 1 hour timeout
            )

            if result.returncode != 0:
                log.status = 'FAILED'
                log.error_message = result.stderr
                log.save()
            else:
                # Log should be updated by the script itself
                pass

        except subprocess.TimeoutExpired:
            log.status = 'FAILED'
            log.error_message = 'Training timeout after 1 hour'
            log.save()
        except Exception as e:
            log.status = 'FAILED'
            log.error_message = str(e)
            log.save()

    thread = threading.Thread(target=run_training)
    thread.daemon = True
    thread.start()

    return Response({
        "message": f"Training started for {model_name}.",
        "log_id": log.id,
        "status": "PENDING",
        "model_version": model_version
    }, status=202)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminRole])
def model_training_status(request):
    """
    Get model training status and history
    """
    # Get latest 10 training logs
    logs = ModelTrainingLog.objects.all()[:10]

    data = []
    for log in logs:
        data.append({
            'id': log.id,
            'model_name': log.model_name,
            'status': log.status,
            'started_at': log.started_at,
            'completed_at': log.completed_at,
            'num_users': log.num_users,
            'num_items': log.num_items,
            'num_cart_interactions': log.num_cart_interactions,
            'num_rent_interactions': log.num_rent_interactions,
            'epochs': log.epochs,
            'final_recall_at_10': float(log.final_recall_at_10) if log.final_recall_at_10 else None,
            'final_ndcg_at_10': float(log.final_ndcg_at_10) if log.final_ndcg_at_10 else None,
            'error_message': log.error_message,
            'created_at': log.created_at,
        })

    # Check if any training is running
    running = ModelTrainingLog.objects.filter(status='RUNNING').exists()

    return Response({
        'logs': data,
        'is_training': running
    })


def _check_model_availability():
    """Return which model versions have weights+data on disk."""
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if os.path.exists(os.path.join(backend_dir, 'ml_model')):
        ml = os.path.join(backend_dir, 'ml_model')
    else:
        ml = os.path.join(os.path.dirname(backend_dir), 'ml_model')

    v1_ready = (
        os.path.exists(os.path.join(ml, 'weights', 'mbcgcn_manga_weights.pth')) and
        os.path.exists(os.path.join(ml, 'data',    'mbcgcn_graph_data.pt'))
    )
    v2_ready = (
        os.path.exists(os.path.join(ml, 'weights', 'mbcgcn_v2_manga_weights.pth')) and
        os.path.exists(os.path.join(ml, 'data',    'mbcgcn_v2_graph_data.pt'))
    )
    return {'v1': v1_ready, 'v2': v2_ready}


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsAdminRole])
def model_config(request):
    """
    GET: Return active model version and availability of each version.
    POST: Set active model version {'active_version': 'v1' | 'v2'}.
    """
    if request.method == 'GET':
        cfg = ModelConfig.get()
        availability = _check_model_availability()
        return Response({
            'active_version': cfg.active_version,
            'active_log_id': cfg.active_log_id,
            'updated_at': cfg.updated_at,
            'updated_by': cfg.updated_by.username if cfg.updated_by else None,
            'availability': availability,
        })

    version = request.data.get('active_version')
    if version not in ('v1', 'v2'):
        return Response({'error': "active_version must be 'v1' or 'v2'."}, status=400)

    availability = _check_model_availability()
    if not availability[version]:
        return Response({
            'error': f"Model {version} weights not found on disk. Train it first."
        }, status=400)

    cfg = ModelConfig.get()
    cfg.active_version = version
    cfg.updated_by = request.user
    cfg.save()

    # Force recommender to reload with the new version
    from .recommender import RecommenderService
    RecommenderService._instance = None

    return Response({
        'active_version': cfg.active_version,
        'message': f'Active model switched to {version}. Recommender reloaded.'
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminRole])
def activate_training_log(request, log_id):
    """
    Activate a specific completed training log as the live model.
    Sets ModelConfig.active_log and active_version, then resets the singleton.
    """
    log = ModelTrainingLog.objects.filter(id=log_id, status='COMPLETED').first()
    if not log:
        return Response({'error': 'Training log not found or not completed.'}, status=404)

    if not log.weight_path or not log.graph_path:
        return Response({'error': 'This log has no saved weight/graph paths. Re-train to generate a rollback-capable checkpoint.'}, status=400)

    import os
    if not os.path.exists(log.weight_path) or not os.path.exists(log.graph_path):
        return Response({'error': 'Weight or graph file no longer exists on disk.'}, status=400)

    cfg = ModelConfig.get()
    cfg.active_version = 'v2' if log.model_name == 'MB-CGCN-v2' else 'v1'
    cfg.active_log = log
    cfg.updated_by = request.user
    cfg.save()

    from .recommender import RecommenderService
    RecommenderService._instance = None

    return Response({
        'message': f'Activated log #{log.id} ({log.model_name}). Recommender reloaded.',
        'active_version': cfg.active_version,
        'log_id': log.id,
    })
