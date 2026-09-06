from lib import Grid

def ninja():
    """teen hero, 48: a lean figure in navy with a hooded mask, a red scarf trailing left, a short blade forward."""
    g = Grid(34, 48)
    pal = {"O":"#1a1230","P":"#5a60a8","p":"#383d78","q":"#232650","C":"#ff4d5e","c":"#b8202f","F":"#ffd9b3","f":"#d9a87a","K":"#1a1a2e","B":"#f4f8ff","b":"#c0cce6","h":"#7c82b4","T":"#3a2a4a","t":"#5c4a6c"}
    # hood + mask
    g.circle(16, 8, 6.4, "p"); g.rect(11, 8, 21, 13, "p")
    g.shade("p", "P", lambda c, r: (c - 16) + (r - 8) < -4, (8, 1, 24, 14))
    g.shade("p", "q", lambda c, r: (c - 16) > 4 or r > 12, (8, 1, 24, 14))
    g.rect(12, 7, 20, 8, "F"); g.px(12, 8, "f"); g.rect(19, 8, 20, 8, "f")
    g.rect(13, 7, 14, 8, "K"); g.rect(18, 7, 19, 8, "K"); g.px(13, 7, "P"); g.px(18, 7, "P")
    # scarf: around the neck, then trailing left and back
    g.rect(11, 13, 21, 15, "C"); g.rect(11, 15, 21, 15, "c")
    g.poly([(11, 13), (2, 14), (1, 19), (6, 18), (11, 16)], "C"); g.shade("C", "c", lambda c, r: r > 16, (0, 12, 10, 20))
    # torso and wrap
    g.rect(11, 16, 21, 29, "p"); g.shade("p", "P", lambda c, r: c < 14, (11, 16, 21, 29)); g.shade("p", "q", lambda c, r: c > 18, (11, 16, 21, 29))
    g.rect(12, 18, 20, 24, "h"); g.shade("h", "p", lambda c, r: c > 17, (12, 18, 20, 24))
    g.rect(11, 27, 21, 28, "c"); g.rect(11, 28, 21, 28, "q")
    # arms: left hanging, right forward with the blade
    g.rect(7, 16, 9, 30, "p"); g.rect(7, 16, 7, 30, "P"); g.rect(7, 29, 9, 31, "F"); g.px(9, 30, "f"); g.rect(7, 22, 9, 22, "q")
    g.rect(22, 18, 27, 21, "p"); g.rect(22, 18, 27, 18, "P"); g.rect(26, 19, 29, 23, "F"); g.px(29, 22, "f"); g.rect(28, 23, 29, 23, "f")
    g.rect(28, 20, 33, 21, "B"); g.rect(28, 21, 33, 21, "b"); g.px(33, 20, "b"); g.px(27, 19, "T"); g.px(27, 22, "T")
    # pants and boots
    for c0 in (10, 17):
        g.rect(c0, 30, c0 + 5, 41, "p"); g.rect(c0, 30, c0 + 1, 41, "P"); g.rect(c0 + 5, 30, c0 + 5, 41, "q")
        g.rect(c0, 38, c0 + 5, 38, "q")
        g.rect(c0, 42, c0 + 5, 46, "T"); g.rect(c0 - 1, 45, c0 + 5, 47, "T"); g.rect(c0, 42, c0 + 1, 43, "t")
    g.rect(16, 30, 16, 47, ".")
    g.ring()
    parts = [("legL", [[30, 47, 8, 16]], None), ("legR", [[30, 47, 16, 24]], None),
             ("armL", [[16, 32, 5, 10]], None), ("armR", [[17, 24, 22, 33]], None),
             ("head", [[0, 12, 6, 26]], None), ("torso", [[12, 30, 0, 33]], None)]
    return g, pal, parts

def wizard():
    """teen hero, 48: a purple robe, a tall pointed hat with a star, a white beard, a staff with a glowing orb."""
    g = Grid(34, 48)
    pal = {"O":"#1a1230","P":"#a684ff","p":"#7452d6","q":"#4a2f8f","Q":"#2c1a5c","Y":"#ffe680","W":"#ffffff","w":"#cfd3ea","F":"#ffd9b3","f":"#d9a87a","K":"#1a1a2e","T":"#8b5a2b","t":"#5c3a18","S":"#9af0ff","s":"#2bb0e0","G":"#ffd23f"}
    # hat: a leaning cone and a wide brim
    g.poly([(17, 0), (9, 12), (25, 12)], "p"); g.rect(6, 12, 27, 13, "p")
    g.shade("p", "P", lambda c, r: c < 15 and r > 2, (0, 0, 33, 13)); g.shade("p", "q", lambda c, r: c > 20, (0, 0, 33, 13))
    g.rect(6, 13, 27, 13, "q"); g.px(19, 6, "Y"); g.rect(18, 7, 20, 7, "Y"); g.px(19, 8, "Y"); g.rect(17, 7, 17, 7, "Y"); g.px(21, 7, "Y")
    # face and beard
    g.rect(12, 14, 21, 19, "F"); g.rect(12, 14, 21, 14, "f"); g.rect(20, 15, 21, 19, "f")
    g.rect(14, 16, 15, 17, "K"); g.rect(18, 16, 19, 17, "K"); g.rect(13, 15, 15, 15, "W"); g.rect(18, 15, 20, 15, "W")
    g.rect(16, 18, 17, 18, "f")
    g.poly([(11, 19), (22, 19), (20, 28), (16, 31), (12, 27)], "W"); g.shade("W", "w", lambda c, r: c > 17 or r > 27, (10, 19, 23, 31))
    # robe, flaring
    g.poly([(11, 20), (22, 20), (27, 44), (6, 44)], "p")
    g.shade("p", "P", lambda c, r: (c - 16) - (r - 30) * 0.15 < -3, (5, 20, 28, 44)); g.shade("p", "q", lambda c, r: (c - 16) - (r - 30) * 0.15 > 4, (5, 20, 28, 44))
    g.shade("q", "Q", lambda c, r: (c - 16) - (r - 30) * 0.15 > 7.5, (5, 20, 28, 44))
    g.rect(11, 30, 22, 31, "G"); g.px(22, 31, "T")
    # sleeves and hands: left down, right up on the staff
    g.rect(6, 21, 10, 33, "p"); g.rect(6, 21, 6, 33, "P"); g.rect(7, 32, 10, 35, "F"); g.rect(9, 32, 10, 35, "f"); g.rect(5, 26, 10, 26, "q")
    g.rect(23, 22, 27, 30, "p"); g.rect(23, 22, 27, 22, "P"); g.rect(27, 24, 27, 30, "q"); g.rect(26, 27, 29, 30, "F"); g.px(29, 30, "f")
    g.rect(29, 10, 30, 42, "T"); g.rect(30, 10, 30, 42, "t"); g.rect(29, 27, 30, 30, "."); g.rect(28, 27, 29, 30, "F")
    g.circle(30, 6.5, 3.4, "s"); g.circle(29.5, 6, 2.2, "S"); g.px(29, 5, "W"); g.rect(29, 10, 30, 10, "t")
    # boots
    g.rect(9, 44, 14, 47, "t"); g.rect(19, 44, 24, 47, "t"); g.rect(9, 44, 10, 44, "T"); g.rect(19, 44, 20, 44, "T")
    g.ring()
    g.rect(22, 22, 22, 30, "q")
    parts = [("legL", [[44, 47, 7, 16]], None), ("legR", [[44, 47, 17, 26]], None),
             ("armL", [[21, 36, 4, 10]], None), ("head", [[0, 13, 0, 28], [14, 31, 10, 24]], None),
             ("armR", [[0, 11, 25, 33], [12, 43, 28, 33], [21, 36, 23, 29]], None), ("torso", [[13, 44, 0, 33]], None)]
    return g, pal, parts

def bat():
    """teen enemy, 32: a purple bat, wings spread, yellow eyes, fangs, claws on the ground."""
    g = Grid(40, 32)
    pal = {"O":"#1a1230","P":"#9a78d0","p":"#6a4aa0","q":"#432a6a","M":"#563a86","m":"#33205a","Y":"#ffe680","K":"#1a1a2e","W":"#ffffff","N":"#ff6a8a"}
    # wings: a top edge from the shoulder out, a scalloped bottom edge
    g.poly([(15, 14), (2, 6), (1, 12), (3, 22), (7, 18), (11, 24), (15, 20)], "M")
    g.poly([(25, 14), (38, 6), (39, 12), (37, 22), (33, 18), (29, 24), (25, 20)], "M")
    g.shade("M", "m", lambda c, r: r > 15, (0, 0, 39, 31)); g.shade("M", "P", lambda c, r: r < 9 and c < 10, (0, 0, 39, 31))
    g.line(14, 14, 4, 9, "p", 1); g.line(24, 14, 34, 9, "p", 1); g.line(14, 15, 7, 17, "p", 1); g.line(24, 15, 31, 17, "p", 1)
    g.rect(15, 12, 15, 19, "."); g.rect(24, 12, 24, 19, ".")
    # body and head as one ovoid with ears
    g.ellipse(20, 19.5, 5, 7.5, "p"); g.circle(20, 14, 4.6, "p")
    g.poly([(16, 12), (15, 5), (19, 10)], "p"); g.poly([(24, 12), (25, 5), (21, 10)], "p")
    g.shade("p", "P", lambda c, r: (c - 20) + (r - 15) < -4, (13, 4, 27, 28)); g.shade("p", "q", lambda c, r: (c - 20) > 2.6 or r > 24, (13, 4, 27, 28))
    g.rect(17, 13, 18, 14, "Y"); g.rect(21, 13, 22, 14, "Y"); g.px(18, 14, "K"); g.px(22, 14, "K")
    g.px(19, 16, "N"); g.px(20, 16, "N"); g.px(18, 17, "W"); g.px(21, 17, "W")
    # tiny claws on the last row
    g.rect(17, 27, 18, 31, "q"); g.rect(21, 27, 22, 31, "q"); g.px(16, 31, "q"); g.px(23, 31, "q")
    g.ring()
    parts = [("legL", [[27, 31, 14, 19]], None), ("legR", [[27, 31, 20, 25]], None),
             ("wingL", [[4, 26, 0, 15]], None), ("wingR", [[4, 26, 24, 39]], None),
             ("head", [[3, 16, 13, 27]], None), ("torso", [[10, 27, 13, 27]], None)]
    return g, pal, parts
