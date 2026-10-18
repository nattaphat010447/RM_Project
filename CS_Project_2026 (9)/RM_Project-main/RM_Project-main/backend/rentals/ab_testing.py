import random
from typing import Optional, Dict, List, Tuple
from django.db.models import Count, Q, Avg, F
from django.utils import timezone
from .models import ABTestVariant, ABTestAssignment, ABTestEvent, User, Manga

class ABTestManager:
    """
    Manages A/B testing for recommendation algorithms
    """

    @staticmethod
    def assign_variant(user: User) -> ABTestVariant:
        """
        Assign a user to an A/B test variant based on traffic percentage
        Returns the assigned variant
        """
        # Check if user already has assignment
        existing = ABTestAssignment.objects.filter(user=user).first()
        if existing:
            return existing.variant

        # Get active variants
        variants = list(ABTestVariant.objects.filter(is_active=True).order_by('id'))

        if not variants:
            # No active variants, return None (will use default algorithm)
            return None

        # Calculate cumulative probabilities
        total_traffic = sum(float(v.traffic_percentage) for v in variants)

        if total_traffic == 0:
            return None

        # Normalize to 100%
        rand_val = random.random() * total_traffic
        cumulative = 0

        selected_variant = None
        for variant in variants:
            cumulative += float(variant.traffic_percentage)
            if rand_val <= cumulative:
                selected_variant = variant
                break

        if not selected_variant:
            selected_variant = variants[-1]  # Fallback to last variant

        # Save assignment
        ABTestAssignment.objects.create(user=user, variant=selected_variant)

        return selected_variant

    @staticmethod
    def get_user_variant(user: User) -> Optional[ABTestVariant]:
        """
        Get the variant assigned to a user
        """
        assignment = ABTestAssignment.objects.filter(user=user).first()
        return assignment.variant if assignment else None

    @staticmethod
    def track_event(user: User, variant: ABTestVariant, manga: Manga,
                   event_type: str, session_id: str = None, metadata: dict = None):
        """
        Track an A/B test event (impression, click, add_to_cart, rental)
        """
        ABTestEvent.objects.create(
            user=user,
            variant=variant,
            manga=manga,
            event_type=event_type,
            session_id=session_id,
            metadata=metadata or {}
        )

    @staticmethod
    def get_variant_metrics(variant_id: int) -> Dict:
        """
        Calculate metrics for a specific variant
        Returns: {
            'impressions': int,
            'clicks': int,
            'add_to_cart': int,
            'rentals': int,
            'ctr': float,
            'conversion_rate': float,
            'unique_users': int
        }
        """
        events = ABTestEvent.objects.filter(variant_id=variant_id)

        impressions = events.filter(event_type='IMPRESSION').count()
        clicks = events.filter(event_type='CLICK').count()
        add_to_cart = events.filter(event_type='ADD_TO_CART').count()
        rentals = events.filter(event_type='RENTAL').count()
        unique_users = events.values('user').distinct().count()

        ctr = (clicks / impressions * 100) if impressions > 0 else 0
        conversion_rate = (rentals / impressions * 100) if impressions > 0 else 0

        return {
            'impressions': impressions,
            'clicks': clicks,
            'add_to_cart': add_to_cart,
            'rentals': rentals,
            'ctr': round(ctr, 2),
            'conversion_rate': round(conversion_rate, 2),
            'unique_users': unique_users
        }

    @staticmethod
    def get_all_variants_metrics() -> List[Dict]:
        """
        Get metrics for all active variants
        """
        variants = ABTestVariant.objects.filter(is_active=True)
        results = []

        for variant in variants:
            metrics = ABTestManager.get_variant_metrics(variant.id)
            results.append({
                'id': variant.id,
                'name': variant.name,
                'algorithm': variant.algorithm,
                'traffic_percentage': float(variant.traffic_percentage),
                'description': variant.description,
                **metrics
            })

        return results

    @staticmethod
    def reset_user_assignment(user: User):
        """
        Reset a user's variant assignment (for re-testing)
        """
        ABTestAssignment.objects.filter(user=user).delete()
