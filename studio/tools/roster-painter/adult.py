from lib import Grid

def brawler():
    """adult hero, 48: a boxer - red headband, dark hair, blue singlet, white shorts, big red gloves, boots."""
    g = Grid(34, 48)
    pal = {"O":"#1a1230","F":"#f0b98a","f":"#c78a5a","d":"#8f5a36","H":"#2a1a0e","h":"#4a2e1a","R":"#ff4d5e","r":"#d81f3a","x":"#8f1020","B":"#3d6cff","b":"#2445b8","W":"#f4f4ff","w":"#c8cce0","K":"#1a1a2e","T":"#2a2438","t":"#4a4260"}
    # head and hair
    g.circle(16, 8, 5.6, "F"); g.rect(11, 8, 21, 12, "F")
    g.shade("F", "f", lambda c, r: (c - 16) > 3 or r > 11, (9, 2, 23, 13)); g.shade("f", "d", lambda c, r: c > 20 and r > 6, (9, 2, 23, 13))
    g.ellipse(16, 4.5, 6, 3.2, "H"); g.rect(10, 4, 11, 8, "H"); g.rect(21, 4, 22, 8, "h"); g.rect(12, 3, 15, 3, "h")
    g.rect(10, 6, 22, 7, "R"); g.rect(10, 7, 22, 7, "r"); g.rect(21, 6, 22, 7, "x")
    g.rect(13, 9, 14, 9, "K"); g.rect(18, 9, 19, 9, "K"); g.rect(15, 11, 18, 11, "d"); g.px(19, 12, "d")
    # neck, singlet, skin of the shoulders
    g.rect(14, 13, 18, 14, "f")
    g.rect(9, 15, 23, 27, "F"); g.rect(11, 15, 21, 27, "B"); g.rect(11, 15, 12, 27, "b"); g.rect(19, 15, 21, 27, "b")
    g.rect(13, 15, 19, 15, "F"); g.rect(11, 16, 12, 16, "F"); g.rect(20, 16, 21, 16, "F")
    g.shade("F", "f", lambda c, r: c > 21, (9, 13, 23, 27))
    # shorts with a red stripe
    g.rect(9, 28, 23, 34, "W"); g.rect(19, 28, 23, 34, "w"); g.rect(9, 28, 23, 28, "r"); g.rect(15, 29, 17, 34, "r"); g.rect(16, 29, 17, 34, "x")
    # arms: left hanging with a glove, right forward with a big glove
    g.rect(4, 15, 8, 26, "F"); g.rect(4, 15, 5, 26, "F"); g.rect(7, 15, 8, 26, "f"); g.rect(4, 20, 8, 20, "f")
    g.ellipse(6, 30, 3.6, 3.8, "r"); g.shade("r", "R", lambda c, r: (c - 6) + (r - 30) < -2, (1, 25, 11, 35)); g.shade("r", "x", lambda c, r: r > 31, (1, 25, 11, 35))
    g.rect(23, 17, 27, 21, "F"); g.rect(23, 20, 27, 21, "f"); g.rect(27, 16, 28, 21, "f")
    g.ellipse(30.5, 19, 3.8, 4.2, "r"); g.shade("r", "R", lambda c, r: (c - 30) + (r - 19) < -2, (26, 13, 33, 24)); g.shade("r", "x", lambda c, r: r > 21 or c > 32, (26, 13, 33, 24))
    g.rect(28, 17, 28, 22, "x")
    # legs and boots
    for c0 in (9, 17):
        g.rect(c0, 35, c0 + 6, 42, "F"); g.rect(c0 + 5, 35, c0 + 6, 42, "f"); g.rect(c0, 35, c0 + 1, 42, "F")
        g.rect(c0, 40, c0 + 6, 42, "T"); g.rect(c0 - 1, 43, c0 + 6, 47, "T"); g.rect(c0, 43, c0 + 1, 44, "t"); g.rect(c0, 40, c0 + 6, 40, "t")
    g.rect(16, 35, 16, 47, ".")
    g.ring()
    parts = [("legL", [[35, 47, 7, 16]], None), ("legR", [[35, 47, 16, 24]], None),
             ("armL", [[14, 35, 0, 9]], None), ("armR", [[12, 25, 22, 33]], None),
             ("head", [[0, 13, 8, 24]], None), ("torso", [[13, 35, 0, 33]], None)]
    return g, pal, parts

def golem():
    """adult boss, 64: a stone brute - a small head sunk between huge shoulders, massive arms with fists at its sides, glowing cracks."""
    g = Grid(56, 64)
    pal = {"O":"#1a1230","S":"#b4bccf","s":"#848da3","d":"#5a6278","q":"#3a3f52","Q":"#262a3a","Y":"#ffc46a","y":"#ff7a1a","K":"#1a1a2e","G":"#6fae4a","g":"#4a7d30"}
    # torso: a wide slab, narrowing to the hips
    g.poly([(12, 16), (43, 16), (40, 46), (15, 46)], "s")
    g.rect(10, 14, 45, 21, "s")
    g.shade("s", "S", lambda c, r: (c - 28) * 0.8 + (r - 30) < -12, (8, 12, 47, 48))
    g.shade("s", "d", lambda c, r: (c - 28) * 0.6 + (r - 30) > 10, (8, 12, 47, 48))
    g.shade("d", "q", lambda c, r: c > 40 or r > 43, (8, 12, 47, 48))
    # stone seams
    g.line(14, 27, 22, 25, "q"); g.line(22, 25, 24, 33, "q"); g.line(24, 33, 36, 34, "q"); g.line(36, 34, 40, 27, "q")
    g.line(16, 39, 30, 41, "q"); g.rect(28, 21, 28, 24, "q")
    # glowing cracks on the chest
    g.line(30, 27, 33, 31, "y"); g.line(33, 31, 32, 36, "y"); g.px(31, 29, "Y"); g.px(33, 32, "Y")
    # head sunk in the shoulders
    g.rect(22, 6, 33, 15, "s"); g.rect(22, 6, 25, 15, "S"); g.rect(22, 6, 32, 6, "S"); g.rect(31, 7, 33, 15, "d"); g.rect(22, 15, 33, 15, "d")
    g.rect(24, 9, 26, 10, "y"); g.rect(29, 9, 31, 10, "y"); g.px(24, 9, "Y"); g.px(29, 9, "Y"); g.rect(24, 12, 31, 12, "q"); g.rect(27, 4, 28, 5, "s"); g.px(27, 4, "S")
    # moss on the shoulders
    g.rect(10, 13, 16, 14, "G"); g.rect(13, 14, 16, 14, "g"); g.rect(41, 13, 45, 14, "G"); g.rect(43, 14, 45, 14, "g"); g.px(12, 15, "g")
    # arms: huge, straight down, fists at the sides
    for c0, light in ((0, True), (46, False)):
        g.rect(c0 + 1, 16, c0 + 8, 40, "s"); g.rect(c0 + 1, 16, c0 + 2, 40, "S" if light else "d"); g.rect(c0 + 7, 16, c0 + 8, 40, "d")
        g.rect(c0 + 1, 28, c0 + 8, 28, "q"); g.rect(c0, 41, c0 + 9, 50, "s"); g.rect(c0, 41, c0 + 1, 50, "S" if light else "d"); g.rect(c0 + 8, 41, c0 + 9, 50, "d")
        g.rect(c0, 48, c0 + 9, 50, "d"); g.rect(c0, 44, c0 + 9, 44, "q"); g.rect(c0 + 3, 45, c0 + 3, 50, "q"); g.rect(c0 + 6, 45, c0 + 6, 50, "q")
    g.shade("S", "s", lambda c, r: c > 40, (44, 12, 55, 55)); g.shade("s", "d", lambda c, r: c > 50, (44, 12, 55, 55))
    g.rect(10, 16, 10, 40, "."); g.rect(45, 22, 45, 40, ".")
    # legs and slab feet
    for c0 in (14, 30):
        g.rect(c0, 46, c0 + 11, 57, "s"); g.rect(c0, 46, c0 + 1, 57, "S"); g.rect(c0 + 9, 46, c0 + 11, 57, "d"); g.rect(c0, 52, c0 + 11, 52, "q")
        g.rect(c0 - 1, 58, c0 + 12, 63, "d"); g.rect(c0 - 1, 58, c0 + 1, 58, "s"); g.rect(c0 - 1, 62, c0 + 12, 63, "q"); g.rect(c0 + 4, 58, c0 + 4, 63, "q")
    g.rect(27, 47, 28, 63, ".")
    g.ring()
    parts = [("legL", [[46, 63, 11, 27]], None), ("legR", [[46, 63, 28, 44]], None),
             ("armL", [[15, 51, 0, 10]], None), ("armR", [[15, 51, 45, 55]], None),
             ("head", [[3, 15, 21, 34]], "SsdqQyYKO"), ("torso", [[12, 47, 0, 55]], None)]
    return g, pal, parts
