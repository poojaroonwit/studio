
export function parseHslString(hslString: string): { h: number; s: number; l: number } | null {
    const match = hslString?.match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
    if (!match) return null;
    return {
        h: parseFloat(match[1]),
        s: parseFloat(match[2]) / 100,
        l: parseFloat(match[3]) / 100,
    };
}

export function hslToHex(h: number, s: number, l: number): string {
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

export function hexToHslString(hex: string): string {
    let r = 0, g = 0, b = 0;
    if (hex.startsWith('#')) hex = hex.substring(1);
    if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
    } else { return "0 0% 0%"; }
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    h = Math.round(h * 360);
    s = Math.round(s * 100);
    const lPercent = Math.round(l * 100);
    return `${h} ${s}% ${lPercent}%`;
}

export function convertHslStringToHex(hslString: string | null | undefined): string {
    if (!hslString) return '#000000';
    const hslObj = parseHslString(hslString);
    if (!hslObj) return '#000000';
    return hslToHex(hslObj.h, hslObj.s, hslObj.l);
}

// Helper to convert HSL start/end to gradient string for ColorPicker
export function hslGradientToGradientString(startHsl: string, endHsl: string, angle: number = 135): string {
    const startHex = convertHslStringToHex(startHsl);
    const endHex = convertHslStringToHex(endHsl);
    return `linear-gradient(${angle}deg, ${startHex} 0%, ${endHex} 100%)`;
}

// Helper to parse gradient string back to HSL start/end
export function gradientStringToHslGradient(gradientString: string): { start: string; end: string } | null {
    // Match gradient format: linear-gradient(angle, color1 position1%, color2 position2%, ...)
    const match = gradientString.match(/linear-gradient\(\d+deg,\s*(.+)\)/);
    if (match) {
        const stopsStr = match[1];
        // Extract all hex colors and their positions
        const colorMatches = stopsStr.matchAll(/(#[0-9A-Fa-f]{6})\s+(\d+)%/g);
        const stops: Array<{ color: string; position: number }> = [];
        for (const match of colorMatches) {
            stops.push({ color: match[1], position: parseInt(match[2]) });
        }
        // Sort by position and get first and last
        stops.sort((a, b) => a.position - b.position);
        if (stops.length >= 2) {
            return {
                start: hexToHslString(stops[0].color),
                end: hexToHslString(stops[stops.length - 1].color)
            };
        } else if (stops.length === 1) {
            // If only one stop, use it for both
            return {
                start: hexToHslString(stops[0].color),
                end: hexToHslString(stops[0].color)
            };
        }
    }
    return null;
}
