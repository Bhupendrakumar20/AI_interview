# adaptive_interview/taxonomy.py

# Rubric criteria per topic, with weights summing to 1.0
RUBRICS = {
    "dsa": {
        "correctness": 0.35,
        "time_complexity": 0.20,
        "space_complexity": 0.15,
        "edge_case_handling": 0.15,
        "problem_decomposition": 0.15,
    },
    "system design": {
        "scalability_reasoning": 0.30,
        "tradeoff_articulation": 0.25,
        "bottleneck_identification": 0.20,
        "data_modeling": 0.15,
        "api_design": 0.10,
    },
    "behavioral": {
        "star_structure": 0.30,
        "specificity_of_impact": 0.30,
        "self_awareness": 0.20,
        "conflict_handling": 0.20,
    },
    "core cs": {
        "conceptual_accuracy": 0.40,
        "depth_of_explanation": 0.25,
        "os_networking_fundamentals": 0.20,
        "concurrency_understanding": 0.15,
    },
    "oop": {
        "encapsulation_and_abstraction": 0.25,
        "inheritance_vs_composition": 0.25,
        "design_pattern_justification": 0.25,
        "solid_principles": 0.25,
    },
}

# Finer-grained concept tags the LLM can attach under a low-scoring criterion,
# used only to make the weak area more specific (e.g. "correctness" -> "recursion").
SUBTOPIC_TAGS = {
    "dsa": ["recursion", "dynamic programming", "graphs", "trees", "arrays", "strings",
            "hash tables", "two pointers", "sliding window", "backtracking", "heaps", "greedy"],
    "system design": ["caching", "load balancing", "sharding", "consistency models",
                       "queueing", "database choice", "rate limiting", "cdn usage"],
    "behavioral": ["leadership examples", "handling failure", "team conflict",
                   "prioritization", "ambiguity handling"],
    "core cs": ["process scheduling", "memory management", "tcp/ip", "indexing",
                "transactions", "threading", "deadlocks"],
    "oop": ["polymorphism", "interfaces", "factory pattern", "observer pattern",
            "single responsibility", "dependency inversion"],
}

WEAK_THRESHOLD = 5      # criterion score at/below this counts as a weakness
LOCK_THRESHOLD = 6.0    # accumulated severity that triggers a topic lock