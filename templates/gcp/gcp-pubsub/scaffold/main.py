import functions_framework
from cloudevents.http import CloudEvent
import json


@functions_framework.cloud_event
def subscribe(cloud_event: CloudEvent):
    """Triggered by a Pub/Sub message."""
    import base64

    data = base64.b64decode(cloud_event.data["message"]["data"]).decode("utf-8")
    message = json.loads(data)

    print(f"[{{service_name}}] Processing message: {json.dumps(message)}")

    # TODO: Implement message processing logic
    process_message(message)

    print(f"[{{service_name}}] Message processed successfully")


def process_message(message: dict):
    """Process a Pub/Sub message."""
    print(f"Processing: {json.dumps(message)}")
