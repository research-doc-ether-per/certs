val raw = payload["status_list"]?.jsonObject
        ?: payload["status"]?.jsonObject?.get("status_list")?.jsonObject
        ?: error("Missing 'status_list' in status JWT payload")
