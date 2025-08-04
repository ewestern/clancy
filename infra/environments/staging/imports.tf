# Terraform import directives for recovering lost state
# Run these commands to import existing resources back into terraform state

#################################################
# CONNECT_HUB MODULE IMPORTS
#################################################
import {
  to = google_pubsub_topic.clancy_connect_hub_staging
  id = "projects/clancy-464816/topics/clancy-connect-hub-staging"
}

# Google Pub/Sub Subscription
import {
  to = google_pubsub_subscription.clancy_connect_hub_staging
  id = "projects/clancy-464816/subscriptions/clancy-connect-hub-staging-subscription"
}
