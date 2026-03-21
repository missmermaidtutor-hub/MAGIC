"""Generate MAGIC star app icon (1024x1024) and splash with 5-color wedges."""
import math
from PIL import Image, ImageDraw, ImageFont

# Darker MAGIC header colors
COLORS = [
    '#78000E',  # M - Dark crimson (top)
    '#9E4502',  # A - Dark orange (upper right)
    '#c1a900',  # G - Dark gold (lower right)
    '#3c9820',  # I - Dark green (lower left)
    '#5008a7',  # C - Dark purple (upper left)
]

LETTERS = ['M', 'A', 'G', 'I', 'C']
BG = '#FFF8E7'
OUTLINE = '#B8860B'  # Dark goldenrod outline (subtler than bright gold)

OUTER_ANGLES = [-90, -18, 54, 126, 198]
INNER_ANGLES = [-54, 18, 90, 162, 234]


def draw_star(draw_ctx, cx, cy, outer_r, inner_r, colors, outline_color, outline_width):
    """Draw a 5-color wedge star."""
    def polar(r, angle_deg):
        rad = math.radians(angle_deg)
        return (cx + r * math.cos(rad), cy + r * math.sin(rad))

    # Draw wedges
    for i in range(5):
        outer_pt = polar(outer_r, OUTER_ANGLES[i])
        inner_left = polar(inner_r, INNER_ANGLES[(i - 1) % 5])
        inner_right = polar(inner_r, INNER_ANGLES[i])
        wedge = [(cx, cy), inner_left, outer_pt, inner_right]
        draw_ctx.polygon(wedge, fill=colors[i])

    # Draw outline
    star_points = []
    for i in range(5):
        star_points.append(polar(outer_r, OUTER_ANGLES[i]))
        star_points.append(polar(inner_r, INNER_ANGLES[i]))

    for i in range(len(star_points)):
        p1 = star_points[i]
        p2 = star_points[(i + 1) % len(star_points)]
        draw_ctx.line([p1, p2], fill=outline_color, width=outline_width)


# ── ICON (1024x1024) ──
SIZE = 1024
img = Image.new('RGBA', (SIZE, SIZE), BG)
draw = ImageDraw.Draw(img)
draw_star(draw, SIZE // 2, SIZE // 2, 420, 160, COLORS, OUTLINE, 6)
img.save('assets/icon.png', 'PNG')
print(f'Icon saved to assets/icon.png ({SIZE}x{SIZE})')

# ── SPLASH (1284x2778) ──
splash_w, splash_h = 1284, 2778
splash = Image.new('RGBA', (splash_w, splash_h), BG)
sdraw = ImageDraw.Draw(splash)

# Star centered, shifted up to make room for text
star_cy = splash_h // 2 - 120
draw_star(sdraw, splash_w // 2, star_cy, 300, 114, COLORS, OUTLINE, 4)

# Find a bold system font
font = None
font_paths = [
    '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
    '/System/Library/Fonts/Helvetica.ttc',
    '/System/Library/Fonts/SFNSDisplay.ttf',
    '/System/Library/Fonts/SFNS.ttf',
]
font_size = 120
for fp in font_paths:
    try:
        font = ImageFont.truetype(fp, font_size)
        break
    except (OSError, IOError):
        continue

if font is None:
    font = ImageFont.load_default()

# Draw "MAGIC" with each letter in its color
text_y = star_cy + 340  # Below the star
word = 'MAGIC'

# Measure total width to center it
total_width = 0
letter_widths = []
for ch in word:
    bbox = font.getbbox(ch)
    w = bbox[2] - bbox[0]
    letter_widths.append(w)
    total_width += w

# Add letter spacing
spacing = 18
total_width += spacing * (len(word) - 1)

# Draw each letter
x = (splash_w - total_width) // 2
for i, ch in enumerate(word):
    sdraw.text((x, text_y), ch, fill=COLORS[i], font=font)
    x += letter_widths[i] + spacing

splash.save('assets/splash.png', 'PNG')
print(f'Splash saved to assets/splash.png ({splash_w}x{splash_h})')
