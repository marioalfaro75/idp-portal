import functions_framework
from flask import jsonify


@functions_framework.http
def {{entry_point}}(request):
    """HTTP Cloud Function."""
    path = request.path

    if path == "/health":
        return jsonify({
            "service": "{{service_name}}",
            "status": "ok",
        })

    return jsonify({
        "message": "Welcome to {{service_name}}",
    })
