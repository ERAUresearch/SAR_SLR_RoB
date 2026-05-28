"""Generate studies.js — the canonical mapping of study_id → PDF filename + metadata.
Output is loaded by the web app at runtime.
"""
import json
import os
import re
import sys

PDF_DIR = r"C:\Users\mayfa\OneDrive\Desktop\SAR SLR\List of Included Studies"

# (study_id, track, citation, year, first_author_key_for_pdf_match)
STUDIES = [
    # ---- Track A: SAR optimization (26) ----
    ("G0165", "A", "Aggarwal et al. (2022). Risk-Aware Path Planning for Unmanned Aerial Systems in a Spreading Wildfire.", 2022, "Aggarwal"),
    ("G0036", "A", "Bernardo et al. (2022). A-Star Based Algorithm Applied to Target Search and Rescue by a UAV Swarm.", 2022, "Bernardo"),
    ("G0299", "A", "Bassolillo et al. (2023). Distributed Navigation in Emergency Scenarios: A Case Study on Post-Avalanche Search and Rescue using Drones.", 2023, "Bassolillo"),
    ("G0284", "A", "Horyna et al. (2022). Decentralized Swarms of Unmanned Aerial Vehicles for Search and Rescue Operations Without Explicit Communication.", 2022, "Horyna"),
    ("G0306", "A", "Wu et al. (2023). An Adaptive Conversion Speed Q-Learning Algorithm for Search and Rescue UAV Path Planning in Unknown Environments.", 2023, "Wu_2023_Adaptive"),
    ("G0222", "A", "Chen et al. (2024). A Drone Swarm-Based Wildfire Search and Rescue Method with Autonomous Behavior Modeling and Centralized Task Assignment.", 2024, "Chen"),
    ("G0372", "A", "He et al. (2024). V-shaped Trajectory Planning of Search and Rescue UAV Based on Target Detection.", 2024, "He"),
    ("G0297", "A", "Liu et al. (2024). Internet of UAVs to Automate Search and Rescue Missions in Post-Disaster for Smart Cities.", 2024, "Liu_2024_Internet"),
    ("G0280", "A", "Wu et al. (2024). Dynamic Importance Weights in Reinforcement Learning with ChatGPT for Drone Swarms in Search and Rescue.", 2024, "Wu_2024_Dynamic"),
    ("G0038", "A", "Abdellatif et al. (2025). Edge-Enabled UAV Swarm Deployment for Rapid Post-Disaster Search and Rescue.", 2025, "Abdellatif"),
    ("G0239", "A", "Anastasiou et al. (2025). Multiple Target Tracking using a UAV Swarm in Maritime Environments.", 2025, "Anastasiou"),
    ("G0302", "A", "Choi et al. (2025). Reinforcement Learning-integrated Evolutionary Algorithm for Enhanced Unmanned Aerial Vehicle Coverage Path Planning.", 2025, "Choi"),
    ("G0296", "A", "Kareem et al. (2025). A Bio-inspired Swarm UAV Framework Integrating Thermal Sensing and Optimization-based Coordination for Efficient Search and Rescue Operations.", 2025, "Kareem_2025"),
    ("G0227", "A", "Khetal et al. (2025). Hierarchical Mapping-Partitioning-Search with Attention-Weighted Communication for UAV Swarms in Search and Rescue Operations.", 2025, "Khetal"),
    ("G0275", "A", "Kopyt & Czaplinska (2025). Multimodal Drone Swarm for Search and Rescue Mission.", 2025, "Kopyt"),
    ("G0231", "A", "Leong (2025). Drone Swarms for Post-Disaster Search and Rescue in Remote and Inaccessible Areas.", 2025, "Leong"),
    ("G0223", "A", "Lima et al. (2025). Drone Swarm Sensitivity Estimation using Bayesian Theory for Search and Rescue Operations.", 2025, "Lima"),
    ("G0225", "A", "Qiu et al. (2025). A Distributed Cooperative Cluster UAV Search and Rescue Method Under Communication Constraints.", 2025, "Qiu"),
    ("G0305", "A", "Yang et al. (2025). A Dual-layer Task Planning Algorithm Based on UAVs-human Cooperation for Search and Rescue.", 2025, "Yang"),
    ("G0356", "A", "Zhao et al. (2025). Autonomous Collaborative Rescue of Drone Swarms in Cluttered Environments.", 2025, "Zhao"),
    ("G0272", "A", "Bialas et al. (2026). From Human Teams to Autonomous Swarms: A Reinforcement Learning-Based Benchmarking Framework for Unmanned Aerial Vehicle Search and Rescue Missions.", 2026, "Bialas"),
    ("G0082", "A", "Gracia Otalvaro & Watson (2026). Soft Actor-Critic Reinforcement Learning Approach to Multi-Drone 3D Terrain Scanning and Target Detection in Search and Rescue Operations.", 2026, "Gracia_Otalvaro"),
    ("G0271", "A", "Kareem et al. (2026). Enhancing Search and Rescue Missions for Victim Detection using a Coordinated Bio-inspired Dual-altitude UAV Swarm Framework.", 2026, "Kareem_2026"),
    ("G0283", "A", "Liu et al. (2026). HGR-QL: Optimized Q-Learning for Multi-UAV Path Planning in Mountain Search and Rescue.", 2026, "Liu_2026_Hgr"),
    ("G0221", "A", "Mather et al. (2026). Impact of Survivor Mobility on UAV Swarm Effectiveness in Search and Rescue.", 2026, "Mather"),
    ("G0313", "A", "Pu et al. (2026). Dynamic Task Allocation for multi-UAVs in Disaster Scenarios: A Novel Two-level Optimization Method with Forecasting.", 2026, "Pu"),
    # ---- Track B: Deconfliction / UTM / ADS-B (23) ----
    ("G0188", "B", "Agnel Tony et al. (2022). Correlated-Equilibrium-Based Unmanned Aerial Vehicle Conflict Resolution.", 2022, "Agnel"),
    ("G0390", "B", "Alharbi et al. (2022). Modeling and Characterization of Traffic Flow Patterns and Identification of Airspace Density for UTM Application.", 2022, "Alharbi"),
    ("G0392", "B", "Pang et al. (2022). Investigation of Flight Technical Error for UAV Separation Requirement Based on Flight Trajectory Data.", 2022, "Pang"),
    ("G0072", "B", "Zhu et al. (2022). Conflict Risk Assessment Between Non-Cooperative Drones and Manned Aircraft in Airport Terminal Areas.", 2022, "Zhu"),
    ("G0412", "B", "Liao et al. (2023). Impact of UAVs Equipped with ADS-B on the Civil Aviation Monitoring System.", 2023, "Liao_2023"),
    ("G0189", "B", "Vila Carbó et al. (2023). Risk-Based Method for Determining Separation Minima in Unmanned Aircraft Systems.", 2023, "Vila_Carbo"),
    ("G0408", "B", "Vitiello et al. (2023). Assessing Performance of Radar and Visual Sensing Techniques for Ground-To-Air Surveillance in Advanced Air Mobility.", 2023, "Vitiello"),
    ("G0101", "B", "Conte et al. (2024). Evaluating a Reinforcement Learning Approach for Collision Avoidance with Heterogeneous Aircraft.", 2024, "Conte"),
    ("G0178", "B", "Leet & Morris (2024). Combinatorial Auction-Based Strategic Deconfliction of Federated UTM Airspace.", 2024, "Leet_and_Morris"),
    ("G0080", "B", "Liao et al. (2024). Interference Analysis for Coexistence of UAVs and Civil Aircrafts Based on Automatic Dependent Surveillance-Broadcast.", 2024, "Liao_2024"),
    ("G0195", "B", "Mukherjee et al. (2024). Autonomous Detect and Avoid Algorithm Respecting Airborne Right of Way Rules.", 2024, "Mukherjee"),
    ("G0183", "B", "Nagrare et al. (2024). Intersection Planning for Multilane Unmanned Aerial Vehicle Traffic Management.", 2024, "Nagrare"),
    ("G0113", "B", "Filippone et al. (2025). Real_Time Simulation as Operational Validation Means of the European DAA System.", 2025, "Filippone"),
    ("G0201", "B", "Murthy et al. (2025a). A Reinforcement Learning Approach to Quiet and Safe UAM Traffic Management.", 2025, "Murthy_2025_Reinforcement"),
    ("G0203", "B", "Murthy et al. (2025b). Separation Assurance in Urban Air Mobility Systems using Shared Scheduling Protocols.", 2025, "Murthy_2025_Separation"),
    ("G0181", "B", "Xue et al. (2025). Safety Benefit Analysis of Conformance Monitoring for Situation Awareness in UTM.", 2025, "Xue"),
    ("G0012", "B", "Shrestha et al. (2025). Dynamic Path Planning for Avoiding Non-Cooperative Threats.", 2025, "Shrestha"),
    ("G0213", "B", "Abdul et al. (2026). Dynamic Geofence Design for Unmanned Aircraft System Path Following in Urban Airspace.", 2026, "Abdul"),
    ("G0218", "B", "Fujita et al. (2026). From Visual to Digital: Coordination Scheduling and Its Effect on Safety and Efficiency in UAM Corridors.", 2026, "Fujita"),
    ("G0200", "B", "Korens et al. (2026). Web-Based Negotiation Tool for Conflict Resolution in Higher Airspace Operations.", 2026, "Korens"),
    ("G0187", "B", "Meng et al. (2026). A Separation Minima Assessment for UAVs Integrating into Terminal Airspace by Monte Carlo Simulations.", 2026, "Meng"),
    ("G0097", "B", "Vielmetti et al. (2026). Multi-Agent Gatekeeper: Safe Flight Planning and Formation Control for Urban Air Mobility.", 2026, "Vielmetti"),
    ("G0186", "B", "Wuwer et al. (2026). Adaptive Trajectory Planning for Safe Low-Level Helicopter Flight in MUM-T Environments.", 2026, "Wuwer"),
    # ---- Track C: Joint / mixed manned-unmanned (5) ----
    ("G0063", "C", "Zhang et al. (2022). Helicopter-UAVs Search and Rescue Task Allocation Considering UAVs Operating Environment and Performance.", 2022, "Zhang_2022"),
    ("G0112", "C", "Al-Husseini et al. (2024). Hierarchical Framework for Optimizing Wildfire Surveillance and Suppression using Human-Autonomous Teaming.", 2024, "Al-Husseini"),
    ("G0194", "C", "Andreeva-Mori et al. (2024). Flight Test Exploration of Integrated Wildfire Response Operations with Crewed and Uncrewed Air Assets.", 2024, "Andreeva-Mori"),
    ("G0014", "C", "Chin et al. (2024). Strategic Planning of Aerial Assets for Disaster Response.", 2024, "Chin"),
    ("G0062", "C", "Zhang et al. (2025). Optimization of Helicopter and UAV Coordinated SAR Time.", 2025, "Zhang_2025"),
]

# Match each study to its PDF filename
pdf_files = os.listdir(PDF_DIR)

def match_pdf(year, key):
    """Find a PDF by year + author key, matching whole words (word-boundary aware)."""
    candidates = []
    key_simple = key.lower().replace("_", " ").replace("-", " ")
    key_parts = key_simple.split()  # e.g., ["wu", "2023", "adaptive"]
    for pdf in pdf_files:
        # Tokenize PDF: lowercase, split on non-word chars
        tokens = re.findall(r"[a-z0-9]+", pdf.lower())
        if str(year) not in tokens:
            continue
        if all(part in tokens for part in key_parts):
            candidates.append(pdf)
    return candidates

unmapped = []
result = []
for sid, track, citation, year, key in STUDIES:
    cands = match_pdf(year, key)
    if len(cands) == 1:
        result.append({"id": sid, "track": track, "citation": citation, "year": year, "pdf": cands[0]})
    else:
        unmapped.append((sid, key, year, cands))

print(f"Mapped: {len(result)} / {len(STUDIES)}")
if unmapped:
    print("\nUNMAPPED / AMBIGUOUS:")
    for sid, key, year, cands in unmapped:
        print(f"  {sid} [{year} {key!r}]: {cands}")
    sys.exit(1)

# Write JS module
js_lines = ["// Auto-generated by _build_data.py — do not hand-edit.",
            "window.STUDIES = ["]
for s in result:
    js_lines.append("  " + json.dumps(s, ensure_ascii=False) + ",")
js_lines.append("];")

out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "studies.js")
with open(out_path, "w", encoding="utf-8") as f:
    f.write("\n".join(js_lines) + "\n")
print(f"\nWrote {out_path}")
