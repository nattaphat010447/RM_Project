"""
Retrain wrapper for MB-CGCN v2 (3 behaviors) — called from Django admin.

This script:
1. Updates ModelTrainingLog to RUNNING
2. Runs prepare_data_v2.py
3. Runs train_v2.py
4. Updates ModelTrainingLog with results
5. Reloads RecommenderService
"""
import os
import sys
import django

# Setup Django
script_dir   = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(os.path.dirname(script_dir))
backend_path = os.path.join(project_root, 'backend')

if not os.path.exists(os.path.join(backend_path, 'core')):
    backend_path = project_root

sys.path.insert(0, backend_path)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from rentals.models import ModelTrainingLog, UserBehaviorLog
from datetime import datetime


def main():
    print("🚀 Starting MB-CGCN v2 retraining process...")

    # Find the PENDING log
    log = ModelTrainingLog.objects.filter(model_name='MB-CGCN-v2', status='PENDING').order_by('-created_at').first()
    if not log:
        print("❌ No PENDING training log found")
        return

    # Update to RUNNING
    log.status = 'RUNNING'
    log.started_at = datetime.now()
    log.save()

    try:
        # Step 1: Prepare data
        print("\n📊 Step 1: Preparing 3-behavior data from web database...")
        sys.path.insert(0, os.path.join(project_root, 'ml_model', 'scripts'))
        from prepare_data_v2 import prepare_from_db

        data = prepare_from_db()

        # Check data sufficiency
        click_count = UserBehaviorLog.objects.filter(event_type='CLICK').count()
        cart_count = UserBehaviorLog.objects.filter(event_type='ADD_CART').count()
        rent_count = UserBehaviorLog.objects.filter(event_type='RENT').count()

        print(f"✅ Data exported: {click_count} CLICK, {cart_count} CART, {rent_count} RENT")

        if click_count < 50 or rent_count < 50:
            raise Exception(f"Insufficient data: need at least 50 CLICK and 50 RENT (got {click_count}, {rent_count})")

        # Step 2: Train model — save to timestamped file so old weights aren't overwritten
        print("\n🤖 Step 2: Training MB-CGCN v2 model...")
        from train_v2 import train_v2

        weight_path = os.path.join(project_root, 'ml_model', 'weights', f'mbcgcn_v2_manga_weights_{log.id}.pth')
        graph_path  = os.path.join(project_root, 'ml_model', 'data',    'mbcgcn_v2_graph_data.pt')

        metrics = train_v2(
            data_path=graph_path,
            output_path=weight_path,
            epochs=600,
            batch_size=400000,
            embed_dim=64,
            device='cpu'
        )

        # Step 3: Update log
        log.status = 'COMPLETED'
        log.completed_at = datetime.now()
        log.num_users = data['num_users']
        log.num_items = data['num_items']
        log.num_cart_interactions = cart_count
        log.num_rent_interactions = rent_count
        log.epochs = 600
        log.final_recall_at_10 = metrics.get('recall@10', 0.0)
        log.final_ndcg_at_10 = metrics.get('ndcg@10', 0.0)
        log.weight_path = weight_path
        log.graph_path  = graph_path

        # Save learned weights to metadata
        if 'learned_weights' in metrics:
            log.metadata = log.metadata or {}
            log.metadata['learned_weights'] = metrics['learned_weights']

        log.save()

        # Step 4: Reload service (optional for v2 — it's not used by default)
        print("\n🔄 Step 4: Service reload (v2 is secondary model, not auto-loaded)")
        # RecommenderService().reload()  # Only if we switch to v2 as default

        print("\n✅ MB-CGCN v2 training completed successfully!")
        print(f"   Recall@10: {metrics.get('recall@10', 0.0):.4f}")
        print(f"   NDCG@10:   {metrics.get('ndcg@10', 0.0):.4f}")
        if 'learned_weights' in metrics:
            w = metrics['learned_weights']
            print(f"   Learned Weights: CLICK={w['click']:.4f}, CART={w['cart']:.4f}, RENT={w['rent']:.4f}")

    except Exception as e:
        print(f"\n❌ Training failed: {str(e)}")
        log.status = 'FAILED'
        log.error_message = str(e)
        log.completed_at = datetime.now()
        log.save()
        raise


if __name__ == '__main__':
    main()
