from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"


def font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    candidates = [
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def centered_text(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    text: str,
    fill: str,
    typeface: ImageFont.ImageFont,
) -> None:
    bbox = draw.textbbox((0, 0), text, font=typeface)
    width = bbox[2] - bbox[0]
    height = bbox[3] - bbox[1]
    x = box[0] + (box[2] - box[0] - width) / 2
    y = box[1] + (box[3] - box[1] - height) / 2 - bbox[1]
    draw.text((x, y), text, fill=fill, font=typeface)


def make_icon(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), "#071426")
    draw = ImageDraw.Draw(image)
    radius = max(6, size // 5)
    draw.rounded_rectangle(
        (0, 0, size - 1, size - 1),
        radius=radius,
        fill="#071426",
        outline="#38bdf8",
        width=max(1, size // 24),
    )
    draw.rounded_rectangle(
        (size * 0.15, size * 0.12, size * 0.85, size * 0.88),
        radius=max(4, size // 8),
        outline="#f97316",
        width=max(1, size // 32),
    )
    centered_text(draw, (0, 0, size, size), "100", "#ffffff", font(max(9, size // 3)))
    return image


def make_og() -> Image.Image:
    width, height = 1200, 630
    image = Image.new("RGB", (width, height), "#071426")
    pixels = image.load()
    for y in range(height):
        for x in range(width):
            t = x / width
            u = y / height
            r = int(7 + 38 * t + 16 * u)
            g = int(20 + 48 * t + 12 * (1 - u))
            b = int(38 + 78 * (1 - t) + 46 * u)
            pixels[x, y] = (r, g, b)

    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((70, 68, 1130, 562), radius=42, outline="#38bdf8", width=3)
    draw.rounded_rectangle((86, 84, 1114, 546), radius=32, outline="#f97316", width=2)
    draw.text((96, 92), "NAME100CHALLENGE.COM", fill="#93c5fd", font=font(34))
    draw.text((96, 210), "Name 100 Women", fill="#ffffff", font=font(92))
    draw.text((96, 315), "Challenge", fill="#ffffff", font=font(92))
    draw.text(
        (100, 440),
        "Can you name 100 famous women in 12 minutes?",
        fill="#dbeafe",
        font=font(38, bold=False),
    )
    draw.rounded_rectangle((904, 168, 1064, 328), radius=36, fill="#0f172a", outline="#38bdf8", width=3)
    centered_text(draw, (904, 168, 1064, 328), "100", "#ffffff", font(62))
    draw.text((900, 354), "12:00", fill="#fb923c", font=font(48))
    return image


def main() -> None:
    PUBLIC.mkdir(exist_ok=True)
    icon32 = make_icon(32)
    icon16 = make_icon(16)
    icon180 = make_icon(180)
    icon192 = make_icon(192)
    icon512 = make_icon(512)

    icon32.save(PUBLIC / "favicon.png")
    icon32.save(PUBLIC / "favicon-32x32.png")
    icon16.save(PUBLIC / "favicon-16x16.png")
    icon180.save(PUBLIC / "apple-touch-icon.png")
    icon192.save(PUBLIC / "android-chrome-192x192.png")
    icon512.save(PUBLIC / "android-chrome-512x512.png")
    icon512.save(PUBLIC / "logo.png")
    icon512.save(PUBLIC / "logo-dark.png")
    icon512.save(PUBLIC / "tanstarter.png")
    icon512.save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    make_og().save(PUBLIC / "og-image.png", optimize=True)


if __name__ == "__main__":
    main()
