def evaluate_capacity(forecast_result: dict, capacity_record: dict) -> dict:
    warnings = []
    
    # Extract capacity record components safely
    internal = float(capacity_record.get("internal_capacity_kg", 0.0))
    co_man = float(capacity_record.get("co_manufacturing_capacity_kg", 0.0))
    downtime = float(capacity_record.get("downtime_kg", 0.0))
    reserved = float(capacity_record.get("reserved_capacity_kg", 0.0))
    
    # Prevent explicitly invalid initial structures
    if internal < 0 or co_man < 0 or downtime < 0 or reserved < 0:
        raise ValueError("Invalid negative capacity inputs provided.")
    
    forecast_demand = float(forecast_result.get("total_demand_kg", 0.0))
    if forecast_demand < 0:
        raise ValueError("Invalid negative forecast demand provided.")

    # Calculate actual available capacity
    available = internal + co_man - downtime - reserved
    if available < 0:
        warnings.append("Calculated available capacity was negative. Clamped to zero.")
        available = 0.0

    # Formulas
    gap = available - forecast_demand
    shortage = max(0.0, forecast_demand - available)
    spare = max(0.0, available - forecast_demand)

    # Utilization
    if available > 0:
        utilization = (forecast_demand / available) * 100.0
    else:
        # Handle zero-capacity cleanly
        utilization = 0.0
        warnings.append("Available capacity is zero. Utilization set to 0.0%.")
        
    # Floating point tolerance logic for status
    if shortage > 0.01:
        status = "SHORTAGE"
    elif spare > 0.01:
        status = "SPARE_CAPACITY"
    else:
        status = "BALANCED"
        
    return {
        "internal_capacity_kg": round(internal, 2),
        "co_manufacturing_capacity_kg": round(co_man, 2),
        "downtime_kg": round(downtime, 2),
        "reserved_capacity_kg": round(reserved, 2),
        "available_capacity_kg": round(available, 2),
        
        "forecast_demand_kg": round(forecast_demand, 2),
        
        "capacity_gap_kg": round(gap, 2),
        "shortage_kg": round(shortage, 2),
        "spare_capacity_kg": round(spare, 2),
        "capacity_utilization_pct": round(utilization, 2),
        
        "status": status,
        "warnings": warnings
    }
