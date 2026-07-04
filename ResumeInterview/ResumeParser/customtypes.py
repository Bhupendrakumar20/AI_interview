import re
from typing import Callable, Dict, List, Literal, Optional, Tuple, TypedDict, Union
from ResumeParser.classes import ResumeKey

class TextItem(TypedDict, total=False):
    text: str
    x: float
    y: float
    width: float
    height: float
    fontName: str
    hasEOL: bool
    bold: bool

TextItems = List[TextItem]
Line = List[TextItem]
Lines = List[Line]
ResumeSectionToLines = Dict[ResumeKey, Lines]
Subsections = List[Lines]

class TextScore(TypedDict):
    text: str
    score: float
    match: bool

TextScores = List[TextScore]

FeatureScore = Literal[-4, -3, -2, -1, 0, 1, 2, 3, 4]

BoolFunc = Callable[[TextItem], bool]
RegexFunc = Callable[[TextItem], Optional[re.Match]]

FeatureSet = Union[
    Tuple[BoolFunc, FeatureScore],
    Tuple[RegexFunc, FeatureScore, bool],
]
