from lib import Grid

def bunny():
    """kids hero, 48: a round white bunny with tall ears, a cream belly, big feet, a carrot in the right paw."""
    g = Grid(32, 48)
    pal = {"O":"#1a1230","F":"#f6f6ff","f":"#cfd3e8","d":"#9098c0","N":"#ffa3c7","n":"#e0608f","L":"#fff7e0","K":"#1a1a2e","W":"#ffffff","C":"#ff8c2a","c":"#d9621a","G":"#5fcf3a","g":"#3e9a26"}
    for cx in (11, 21):
        g.ellipse(cx, 8, 3.4, 8, "F"); g.ellipse(cx, 8.8, 1.6, 5.4, "N")
    g.shade("F", "f", lambda c, r: c > 22 and r < 13)
    g.shade("N", "n", lambda c, r: c > 21)
    g.circle(16, 20, 8.3, "F")
    g.rect(13, 27, 19, 28, "F")
    g.shade("F", "f", lambda c, r: (c - 16) > 5 or (r - 20) > 5.8, (7, 12, 25, 29))
    g.shade("f", "d", lambda c, r: (c - 16) > 6.8 and (r - 20) > 1, (7, 12, 25, 29))
    g.ellipse(16, 24.5, 3.6, 2.2, "L")
    g.rect(12, 19, 13, 20, "K"); g.rect(18, 19, 19, 20, "K"); g.px(12, 19, "W"); g.px(18, 19, "W")
    g.rect(15, 23, 16, 23, "n"); g.px(15, 24, "n")
    g.rect(9, 22, 10, 22, "N"); g.rect(21, 22, 22, 22, "N")
    # body, belly
    g.ellipse(16, 35.5, 6.6, 6.8, "F"); g.ellipse(16, 36.5, 3.8, 4.4, "L")
    g.shade("F", "f", lambda c, r: (c - 16) + (r - 35) * 0.4 > 4.2, (8, 29, 24, 43))
    g.shade("f", "d", lambda c, r: (c - 16) > 5.6, (8, 29, 24, 43))
    # left arm hanging, a gap column so the ring separates it
    g.ellipse(6.5, 32.5, 2.1, 4.4, "F"); g.shade("F", "f", lambda c, r: r > 33, (3, 27, 9, 38))
    # right arm forward with the carrot
    g.ellipse(24.5, 30, 2.6, 2.6, "F"); g.shade("F", "f", lambda c, r: r > 30, (21, 27, 28, 33))
    for i in range(7):
        c, r = 25 + i, 30 - i
        g.rect(c, r, c + 1, r, "C"); g.px(c + 1, r, "c")
    g.rect(30, 21, 31, 22, "G"); g.px(31, 20, "g"); g.px(31, 23, "g")
    # legs and the big feet
    g.rect(12, 41, 14, 42, "f"); g.rect(18, 41, 20, 42, "f")
    g.ellipse(11, 45.2, 4.6, 2.8, "F"); g.ellipse(21, 45.2, 4.6, 2.8, "F")
    g.shade("F", "f", lambda c, r: r >= 46, (5, 42, 27, 47)); g.px(9, 47, "d"); g.px(19, 47, "d")
    g.rect(15, 44, 15, 47, ".")
    g.ring()
    parts = [("legL", [[40, 47, 4, 15]], None), ("legR", [[40, 47, 16, 27]], None),
             ("armL", [[27, 38, 2, 9]], None), ("head", [[0, 28, 0, 25]], None),
             ("armR", [[19, 34, 20, 31]], None), ("torso", [[27, 40, 0, 31]], None)]
    return g, pal, parts

def crab():
    """kids enemy, 32: a wide orange crab, eyes on stalks, two claws, three legs a side."""
    g = Grid(40, 32)
    pal = {"O":"#1a1230","R":"#ff8a5a","r":"#f0503a","d":"#b02a1e","q":"#6e1410","K":"#1a1a2e","W":"#ffffff","Y":"#ffe0a0"}
    g.ellipse(20, 19, 12.5, 7.5, "r")
    g.shade("r", "R", lambda c, r: (c - 20) * 0.6 + (r - 19) < -3, (7, 11, 33, 27))
    g.shade("r", "d", lambda c, r: (c - 20) * 0.5 + (r - 19) > 4.5, (7, 11, 33, 27))
    g.shade("d", "q", lambda c, r: r >= 25, (7, 11, 33, 27))
    # mouth and a shell seam
    g.rect(17, 22, 23, 22, "q"); g.px(16, 21, "q"); g.px(24, 21, "q")
    # eye stalks
    for cx in (15, 25):
        g.rect(cx, 7, cx + 1, 11, "r"); g.px(cx + 1, 8, "d"); g.px(cx + 1, 10, "d")
        g.circle(cx + 1, 5.5, 2.4, "W"); g.rect(cx, 5, cx + 1, 6, "K"); g.px(cx + 1, 6, "K"); g.px(cx, 5, "W")
    # claws
    for cx, sgn in ((5.5, -1), (34.5, 1)):
        g.ellipse(cx, 16, 4.6, 4.2, "r")
        g.shade("r", "R", lambda c, r: r < 14, (0, 10, 10, 22)); g.shade("r", "R", lambda c, r: r < 14, (29, 10, 39, 22))
        g.shade("r", "d", lambda c, r: r > 18, (0, 10, 10, 22)); g.shade("r", "d", lambda c, r: r > 18, (29, 10, 39, 22))
        g.rect(int(cx + sgn * 1) - (1 if sgn < 0 else 0), 15, int(cx + sgn * 4) - (1 if sgn < 0 else 0), 16, ".")
        g.ellipse(cx, 9.5, 2.2, 2.2, "r"); g.shade("r", "R", lambda c, r: r < 9, (0, 6, 39, 12))
    g.rect(9, 17, 10, 19, "r"); g.rect(29, 17, 30, 19, "r")
    # legs, three a side, each two cells thick, down to the last row
    for k, (c0, r0) in enumerate(((8, 24), (10, 26), (13, 27))):
        g.line(c0, r0, c0 - 3 + k, 31, "d", 2)
    for k, (c0, r0) in enumerate(((30, 24), (28, 26), (25, 27))):
        g.line(c0, r0, c0 + 2 - k, 31, "d", 2)
    g.shade("d", "q", lambda c, r: r >= 30, (0, 28, 39, 31))
    g.ring()
    parts = [("legL", [[25, 31, 0, 18]], "dqO"), ("legR", [[25, 31, 21, 39]], "dqO"),
             ("clawL", [[5, 22, 0, 10]], None), ("clawR", [[5, 22, 29, 39]], None),
             ("head", [[0, 11, 11, 29]], None), ("torso", [[0, 31, 0, 39]], None)]
    return g, pal, parts

def owl():
    """kids boss, 64: the Owl King - a big brown ovoid, huge yellow eyes, a gold crown, ear tufts, wings, talons."""
    g = Grid(56, 64)
    pal = {"O":"#1a1230","F":"#b8783c","f":"#dea468","d":"#7a4a1e","q":"#4a2a0e","L":"#f4dfb0","l":"#d9b880","Y":"#ffe680","y":"#ffc21a","K":"#1a1a2e","W":"#ffffff","N":"#ff8c2a","n":"#c95e14","G":"#ffd23f","g":"#c9932a"}
    g.ellipse(28, 38, 17.5, 22.5, "F")
    g.rect(14, 12, 41, 40, "F")
    g.ellipse(28, 16, 15, 8, "F")
    # ear tufts
    g.poly([(14, 15), (10, 4), (20, 12)], "F"); g.poly([(42, 15), (46, 4), (36, 12)], "F")
    g.shade("F", "f", lambda c, r: (c - 28) * 0.7 + (r - 30) < -14, (0, 0, 55, 63))
    g.shade("F", "d", lambda c, r: (c - 28) * 0.5 + (r - 38) > 15, (0, 0, 55, 63))
    g.shade("d", "q", lambda c, r: r > 55 or c > 43, (0, 0, 55, 63))
    # belly of light feathers with chevrons
    g.ellipse(28, 44, 11, 13.5, "L")
    g.shade("L", "l", lambda c, r: (c - 28) > 6 or (r - 44) > 9, (0, 0, 55, 63))
    for r in (36, 41, 46, 51):
        for c in range(18, 39):
            if (c + r) % 5 == 0: g.px(c, r, "l")
    # crown
    g.rect(20, 5, 36, 10, "G"); g.rect(20, 10, 36, 10, "g"); g.rect(35, 5, 36, 10, "g")
    for c in (20, 24, 28, 32, 36): g.rect(c, 2, c, 4, "G")
    g.px(28, 1, "G"); g.rect(28, 7, 28, 8, "N"); g.px(23, 8, "N"); g.px(33, 8, "N")
    # eyes: white ring, yellow iris, dark pupil, a glint
    for cx in (20, 36):
        g.circle(cx, 25, 6.4, "W"); g.circle(cx, 25, 5, "y"); g.shade("y", "Y", lambda c, r: (c - cx) + (r - 25) < -2, (0, 0, 55, 63))
        g.circle(cx, 26, 2.6, "K"); g.px(cx - 1, 24, "W")
    # beak
    g.poly([(25, 30), (31, 30), (28, 36)], "N"); g.px(28, 34, "n"); g.rect(28, 31, 30, 31, "n")
    # wings, a gap column each side so the ring separates them
    g.ellipse(8, 40, 5.5, 13, "F"); g.ellipse(48, 40, 5.5, 13, "F")
    g.shade("F", "f", lambda c, r: c < 7 and r < 40, (0, 26, 12, 54)); g.shade("F", "d", lambda c, r: r > 44, (0, 26, 12, 54))
    g.shade("F", "d", lambda c, r: r > 36 or c > 49, (44, 26, 55, 54)); g.shade("d", "q", lambda c, r: r > 46, (44, 26, 55, 54))
    for r in (46, 50): g.rect(4, r, 11, r, "d"); g.rect(44, r, 51, r, "q")
    g.rect(13, 30, 13, 52, "."); g.rect(42, 30, 42, 52, ".")
    # talons
    for c0 in (17, 31):
        g.rect(c0 + 1, 58, c0 + 6, 60, "N"); g.rect(c0, 61, c0 + 7, 63, "N")
        g.px(c0 + 2, 63, "n"); g.px(c0 + 5, 63, "n"); g.rect(c0 + 7, 61, c0 + 7, 63, "n")
    g.ring()
    parts = [("legL", [[57, 63, 14, 26]], "NnO"), ("legR", [[57, 63, 28, 40]], "NnO"),
             ("wingL", [[26, 54, 0, 13]], None), ("wingR", [[26, 54, 42, 55]], None),
             ("head", [[0, 33, 0, 55]], None), ("torso", [[0, 63, 0, 55]], None)]
    return g, pal, parts
