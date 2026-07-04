import re
from typing import List, Tuple, Optional
from ResumeParser.customtypes import TextItem, TextItems, TextScore, FeatureSet, TextScores


def compute_feature_scores(
    text_items: TextItems,
    feature_sets: List[FeatureSet]
) -> TextScores:
    
    text_scores = [
        TextScore(text=item["text"], score=0, match=False)
        for item in text_items
    ]

    for i, text_item in enumerate(text_items):
        for feature_set in feature_sets:
            if len(feature_set) == 2:
                has_feature, score = feature_set
                result = has_feature(text_item)
                if result:
                    text_scores[i]["score"] += score
                    text_scores[i]["match"] = True
            elif len(feature_set) == 3:
                has_feature, score, return_matching_text = feature_set
                result = has_feature(text_item)
                if result:
                    text = text_item["text"]
                    if return_matching_text and isinstance(result, re.Match):
                        text = result.group(0)

                    text_score = text_scores[i]
                    if text_item["text"] == text:
                        text_score["score"] += score
                        if return_matching_text:
                            text_score["match"] = True
                    else:
                        text_scores.append(TextScore(text=text, score=score, match=True))

    return text_scores


def get_text_with_highest_feature_score(
    text_items: TextItems,
    feature_sets: List[FeatureSet],
    return_empty_string_if_highest_score_is_not_positive: bool = True,
    return_concatenated_string_for_texts_with_same_highest_score: bool = False
) -> Tuple[str, TextScores]:
    """
    Core utility for the feature scoring system.

    Runs each text item through all feature sets and sums up the matching feature scores.
    Returns the text item with the highest computed feature score.

    Args:
        text_items: List of TextItem objects to analyze
        feature_sets: List of feature sets to apply
        return_empty_string_if_highest_score_is_not_positive: If True, return empty string if highest score <= 0
        return_concatenated_string_for_texts_with_same_highest_score: If True, concatenate texts with same highest score

    Returns:
        Tuple of (selected_text, all_text_scores)
    """
    text_scores = compute_feature_scores(text_items, feature_sets)

    texts_with_highest_feature_score: List[str] = []
    highest_score = float('-inf')

    for text_score in text_scores:
        score = text_score["score"]
        if score >= highest_score:
            if score > highest_score:
                texts_with_highest_feature_score = []
            texts_with_highest_feature_score.append(text_score["text"])
            highest_score = score

    if return_empty_string_if_highest_score_is_not_positive and highest_score <= 0:
        return "", text_scores

    # If text_items is empty, texts_with_highest_feature_score[0] will raise IndexError, so default to empty string
    if not return_concatenated_string_for_texts_with_same_highest_score:
        text = texts_with_highest_feature_score[0] if texts_with_highest_feature_score else ""
    else:
        text = " ".join(s.strip() for s in texts_with_highest_feature_score)

    return text, text_scores