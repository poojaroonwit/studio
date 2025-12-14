/**
 * Tests for position utility functions
 */

import { describe, it, expect } from 'vitest';
import {
    getPositionStatusBadge,
    getPositionStatusColor,
    getPositionStatusBgColor,
    getPositionStatusText,
    POSITION_STATUS
} from '../positionUtils';

describe('positionUtils', () => {
    describe('POSITION_STATUS', () => {
        it('should have correct values', () => {
            expect(POSITION_STATUS.OPEN).toBe(true);
            expect(POSITION_STATUS.CLOSED).toBe(false);
        });
    });

    describe('getPositionStatusBadge', () => {
        it('should return correct badge for open position', () => {
            const result = getPositionStatusBadge(true);

            expect(result.variant).toBe('default');
            expect(result.className).toContain('bg-green');
            expect(result.text).toBe('Open');
        });

        it('should return correct badge for closed position', () => {
            const result = getPositionStatusBadge(false);

            expect(result.variant).toBe('secondary');
            expect(result.className).toContain('bg-gray');
            expect(result.text).toBe('Closed');
        });

        it('should respect showIcon parameter', () => {
            const resultWithIcon = getPositionStatusBadge(true, true);
            const resultWithoutIcon = getPositionStatusBadge(true, false);

            expect(resultWithIcon.text).toBe('Open');
            expect(resultWithoutIcon.text).toBe('Open');
        });
    });

    describe('getPositionStatusColor', () => {
        it('should return green for open position', () => {
            const result = getPositionStatusColor(true);
            expect(result).toContain('green');
        });

        it('should return gray for closed position', () => {
            const result = getPositionStatusColor(false);
            expect(result).toContain('gray');
        });
    });

    describe('getPositionStatusBgColor', () => {
        it('should return green background for open position', () => {
            const result = getPositionStatusBgColor(true);
            expect(result).toContain('green');
        });

        it('should return gray background for closed position', () => {
            const result = getPositionStatusBgColor(false);
            expect(result).toContain('gray');
        });
    });

    describe('getPositionStatusText', () => {
        it('should return "Open" for open position', () => {
            expect(getPositionStatusText(true)).toBe('Open');
        });

        it('should return "Closed" for closed position', () => {
            expect(getPositionStatusText(false)).toBe('Closed');
        });
    });
});
