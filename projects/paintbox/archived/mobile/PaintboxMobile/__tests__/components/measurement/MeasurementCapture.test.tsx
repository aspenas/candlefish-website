import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { MeasurementCapture } from '../../../src/components/measurement/MeasurementCapture';
import * as Location from 'expo-location';

// Mock dependencies
jest.mock('expo-location');
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: { alert: jest.fn() },
  Dimensions: {
    get: () => ({ width: 375, height: 812 }),
  },
}));

jest.mock('react-native-svg', () => ({
  Svg: 'Svg',
  Line: 'Line',
  Circle: 'Circle',
  Text: 'Text',
  G: 'G',
}));

const mockLocation = Location as jest.Mocked<typeof Location>;

describe('MeasurementCapture Component', () => {
  const mockOnMeasurementComplete = jest.fn();
  const mockOnCancel = jest.fn();

  const defaultProps = {
    roomName: 'Kitchen',
    onMeasurementComplete: mockOnMeasurementComplete,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted' as any,
    });
    mockLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: {
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    });
  });

  describe('Initialization', () => {
    it('should render measurement interface with instructions', () => {
      const { getByText, getByTestId } = render(
        <MeasurementCapture {...defaultProps} />
      );

      expect(getByText('Measuring: Kitchen')).toBeTruthy();
      expect(getByText('Tap to mark corners of the room')).toBeTruthy();
      expect(getByTestId('measurement-canvas')).toBeTruthy();
      expect(getByTestId('done-button')).toBeTruthy();
      expect(getByTestId('cancel-button')).toBeTruthy();
    });

    it('should request location permissions on mount', async () => {
      render(<MeasurementCapture {...defaultProps} />);

      await waitFor(() => {
        expect(mockLocation.requestForegroundPermissionsAsync).toHaveBeenCalled();
      });
    });

    it('should handle location permission denied', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'denied' as any,
      });

      render(<MeasurementCapture {...defaultProps} />);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Location Access',
          'Location access helps improve measurement accuracy. You can still take measurements without it.',
          expect.any(Array)
        );
      });
    });
  });

  describe('Point Marking', () => {
    it('should add measurement points when canvas is tapped', () => {
      const { getByTestId } = render(
        <MeasurementCapture {...defaultProps} />
      );

      const canvas = getByTestId('measurement-canvas');

      // Tap first corner
      fireEvent(canvas, 'onTouchStart', {
        nativeEvent: {
          locationX: 100,
          locationY: 150,
        },
      });

      // Should show first point
      expect(getByTestId('point-0')).toBeTruthy();
    });

    it('should connect points with lines after second point', () => {
      const { getByTestId } = render(
        <MeasurementCapture {...defaultProps} />
      );

      const canvas = getByTestId('measurement-canvas');

      // Add two points
      fireEvent(canvas, 'onTouchStart', {
        nativeEvent: { locationX: 100, locationY: 150 },
      });

      fireEvent(canvas, 'onTouchStart', {
        nativeEvent: { locationX: 200, locationY: 150 },
      });

      expect(getByTestId('point-0')).toBeTruthy();
      expect(getByTestId('point-1')).toBeTruthy();
      expect(getByTestId('line-0-1')).toBeTruthy();
    });

    it('should close polygon when returning to start point', async () => {
      const { getByTestId } = render(
        <MeasurementCapture {...defaultProps} />
      );

      const canvas = getByTestId('measurement-canvas');

      // Create a rectangle
      const points = [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 200, y: 200 },
        { x: 100, y: 200 },
      ];

      points.forEach((point, index) => {
        fireEvent(canvas, 'onTouchStart', {
          nativeEvent: { locationX: point.x, locationY: point.y },
        });
      });

      // Tap near the first point to close
      fireEvent(canvas, 'onTouchStart', {
        nativeEvent: { locationX: 105, locationY: 105 },
      });

      await waitFor(() => {
        expect(getByTestId('polygon-closed')).toBeTruthy();
      });
    });

    it('should show distance measurements between points', () => {
      const { getByTestId } = render(
        <MeasurementCapture {...defaultProps} />
      );

      const canvas = getByTestId('measurement-canvas');

      fireEvent(canvas, 'onTouchStart', {
        nativeEvent: { locationX: 100, locationY: 100 },
      });

      fireEvent(canvas, 'onTouchStart', {
        nativeEvent: { locationX: 200, locationY: 100 },
      });

      // Should show distance label
      expect(getByTestId('distance-label-0')).toBeTruthy();
    });

    it('should allow editing points by dragging', () => {
      const { getByTestId } = render(
        <MeasurementCapture {...defaultProps} />
      );

      const canvas = getByTestId('measurement-canvas');

      // Add a point
      fireEvent(canvas, 'onTouchStart', {
        nativeEvent: { locationX: 100, locationY: 100 },
      });

      const point = getByTestId('point-0');

      // Start dragging
      fireEvent(point, 'onPanGestureEvent', {
        nativeEvent: {
          translationX: 50,
          translationY: 25,
          state: 4, // ACTIVE state
        },
      });

      // Point should have moved
      expect(point.props.style).toEqual(
        expect.objectContaining({
          transform: [
            { translateX: 150 },
            { translateY: 125 },
          ],
        })
      );
    });
  });

  describe('Area Calculation', () => {
    it('should calculate room area from polygon', async () => {
      const { getByTestId, getByText } = render(
        <MeasurementCapture {...defaultProps} />
      );

      const canvas = getByTestId('measurement-canvas');

      // Create a 10ft x 12ft rectangle (assuming 10px = 1ft scale)
      const rectangle = [
        { x: 100, y: 100 }, // Top-left
        { x: 200, y: 100 }, // Top-right (10ft wide)
        { x: 200, y: 220 }, // Bottom-right (12ft tall)
        { x: 100, y: 220 }, // Bottom-left
        { x: 105, y: 105 }, // Close to first point
      ];

      rectangle.forEach(point => {
        fireEvent(canvas, 'onTouchStart', {
          nativeEvent: { locationX: point.x, locationY: point.y },
        });
      });

      await waitFor(() => {
        expect(getByText(/Area: 120 sq ft/)).toBeTruthy();
      });
    });

    it('should handle complex polygon shapes', async () => {
      const { getByTestId } = render(
        <MeasurementCapture {...defaultProps} />
      );

      const canvas = getByTestId('measurement-canvas');

      // Create an L-shaped room
      const lShape = [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 200, y: 150 },
        { x: 150, y: 150 },
        { x: 150, y: 200 },
        { x: 100, y: 200 },
        { x: 105, y: 105 }, // Close
      ];

      lShape.forEach(point => {
        fireEvent(canvas, 'onTouchStart', {
          nativeEvent: { locationX: point.x, locationY: point.y },
        });
      });

      await waitFor(() => {
        expect(getByTestId('area-calculation')).toBeTruthy();
      });
    });

    it('should exclude obstacles and openings', () => {
      const { getByTestId } = render(
        <MeasurementCapture {...defaultProps} enableObstacles={true} />
      );

      // Switch to obstacle mode
      const obstacleButton = getByTestId('obstacle-mode-button');
      fireEvent.press(obstacleButton);

      const canvas = getByTestId('measurement-canvas');

      // Draw an obstacle (like a kitchen island)
      fireEvent(canvas, 'onTouchStart', {
        nativeEvent: { locationX: 130, locationY: 130 },
      });

      fireEvent(canvas, 'onTouchStart', {
        nativeEvent: { locationX: 170, locationY: 130 },
      });

      fireEvent(canvas, 'onTouchStart', {
        nativeEvent: { locationX: 170, locationY: 170 },
      });

      fireEvent(canvas, 'onTouchStart', {
        nativeEvent: { locationX: 130, locationY: 170 },
      });

      expect(getByTestId('obstacle-0')).toBeTruthy();
    });
  });

  describe('Scale Calibration', () => {
    it('should allow setting measurement scale', () => {
      const { getByTestId, getByPlaceholderText } = render(
        <MeasurementCapture {...defaultProps} />
      );

      const scaleButton = getByTestId('scale-button');
      fireEvent.press(scaleButton);

      const scaleInput = getByPlaceholderText('Enter actual length (ft)');
      fireEvent.changeText(scaleInput, '10');

      const confirmButton = getByTestId('confirm-scale');
      fireEvent.press(confirmButton);

      expect(getByTestId('scale-indicator')).toBeTruthy();
    });

    it('should apply scale to all measurements', () => {
      const { getByTestId } = render(
        <MeasurementCapture {...defaultProps} scale={0.1} />
      );

      const canvas = getByTestId('measurement-canvas');

      // Draw a 100px line (should be 10ft with 0.1 scale)
      fireEvent(canvas, 'onTouchStart', {
        nativeEvent: { locationX: 100, locationY: 100 },
      });

      fireEvent(canvas, 'onTouchStart', {
        nativeEvent: { locationX: 200, locationY: 100 },
      });

      expect(getByTestId('distance-label-0')).toHaveProp('children', '10.0 ft');
    });

    it('should suggest scale based on typical room dimensions', async () => {
      const { getByTestId, getByText } = render(
        <MeasurementCapture {...defaultProps} />
      );

      const canvas = getByTestId('measurement-canvas');

      // Draw a rectangle
      const rectangle = [
        { x: 50, y: 50 },
        { x: 250, y: 50 },
        { x: 250, y: 200 },
        { x: 50, y: 200 },
        { x: 55, y: 55 }, // Close
      ];

      rectangle.forEach(point => {
        fireEvent(canvas, 'onTouchStart', {
          nativeEvent: { locationX: point.x, locationY: point.y },
        });
      });

      await waitFor(() => {
        expect(getByText(/Suggested scale/)).toBeTruthy();
      });
    });
  });

  describe('GPS Integration', () => {
    it('should capture GPS coordinates with measurements', async () => {
      render(<MeasurementCapture {...defaultProps} />);

      await waitFor(() => {
        expect(mockLocation.getCurrentPositionAsync).toHaveBeenCalledWith({
          accuracy: Location.Accuracy.High,
        });
      });
    });

    it('should include GPS data in measurement results', async () => {
      const { getByTestId } = render(
        <MeasurementCapture {...defaultProps} />
      );

      const canvas = getByTestId('measurement-canvas');

      // Create a simple room
      const points = [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 200, y: 200 },
        { x: 100, y: 200 },
        { x: 105, y: 105 },
      ];

      points.forEach(point => {
        fireEvent(canvas, 'onTouchStart', {
          nativeEvent: { locationX: point.x, locationY: point.y },
        });
      });

      const doneButton = getByTestId('done-button');
      fireEvent.press(doneButton);

      await waitFor(() => {
        expect(mockOnMeasurementComplete).toHaveBeenCalledWith({
          roomName: 'Kitchen',
          area: expect.any(Number),
          perimeter: expect.any(Number),
          points: expect.any(Array),
          gpsCoordinates: {
            latitude: 40.7128,
            longitude: -74.0060,
            accuracy: 10,
          },
          timestamp: expect.any(String),
        });
      });
    });

    it('should handle GPS unavailable gracefully', async () => {
      mockLocation.getCurrentPositionAsync.mockRejectedValue(
        new Error('Location unavailable')
      );

      const { getByTestId } = render(
        <MeasurementCapture {...defaultProps} />
      );

      const canvas = getByTestId('measurement-canvas');

      // Create measurements
      fireEvent(canvas, 'onTouchStart', {
        nativeEvent: { locationX: 100, locationY: 100 },
      });

      const doneButton = getByTestId('done-button');
      fireEvent.press(doneButton);

      await waitFor(() => {
        expect(mockOnMeasurementComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            gpsCoordinates: null,
          })
        );
      });
    });
  });

  describe('Validation and Error Handling', () => {
    it('should prevent completion with insufficient points', () => {
      const { getByTestId } = render(
        <MeasurementCapture {...defaultProps} />
      );

      const canvas = getByTestId('measurement-canvas');

      // Add only one point
      fireEvent(canvas, 'onTouchStart', {
        nativeEvent: { locationX: 100, locationY: 100 },
      });

      const doneButton = getByTestId('done-button');
      fireEvent.press(doneButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Incomplete Measurement',
        'Please mark at least 3 points to define a room.',
        expect.any(Array)
      );
    });

    it('should validate minimum room area', () => {
      const { getByTestId } = render(
        <MeasurementCapture {...defaultProps} />
      );

      const canvas = getByTestId('measurement-canvas');

      // Create a tiny triangle
      const tinyTriangle = [
        { x: 100, y: 100 },
        { x: 105, y: 100 },
        { x: 102, y: 105 },
        { x: 102, y: 102 },
      ];

      tinyTriangle.forEach(point => {
        fireEvent(canvas, 'onTouchStart', {
          nativeEvent: { locationX: point.x, locationY: point.y },
        });
      });

      const doneButton = getByTestId('done-button');
      fireEvent.press(doneButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Area Too Small',
        'The measured area seems too small for a room. Please check your measurements.',
        expect.any(Array)
      );
    });

    it('should detect self-intersecting polygons', () => {
      const { getByTestId } = render(
        <MeasurementCapture {...defaultProps} />
      );

      const canvas = getByTestId('measurement-canvas');

      // Create a bow-tie shape (self-intersecting)
      const bowTie = [
        { x: 100, y: 100 },
        { x: 200, y: 200 },
        { x: 200, y: 100 },
        { x: 100, y: 200 },
        { x: 105, y: 105 },
      ];

      bowTie.forEach(point => {
        fireEvent(canvas, 'onTouchStart', {
          nativeEvent: { locationX: point.x, locationY: point.y },
        });
      });

      expect(getByTestId('polygon-warning')).toBeTruthy();
    });

    it('should warn about unrealistic room dimensions', async () => {
      const { getByTestId } = render(
        <MeasurementCapture {...defaultProps} />
      );

      const canvas = getByTestId('measurement-canvas');

      // Create an extremely long narrow room (100ft x 1ft)
      const longRoom = [
        { x: 50, y: 100 },
        { x: 1050, y: 100 }, // 100ft at 10px/ft
        { x: 1050, y: 110 }, // 1ft height
        { x: 50, y: 110 },
        { x: 55, y: 105 },
      ];

      longRoom.forEach(point => {
        fireEvent(canvas, 'onTouchStart', {
          nativeEvent: { locationX: point.x, locationY: point.y },
        });
      });

      await waitFor(() => {
        expect(getByTestId('dimension-warning')).toBeTruthy();
      });
    });
  });

  describe('Undo/Redo Functionality', () => {
    it('should allow undoing last point', () => {
      const { getByTestId } = render(
        <MeasurementCapture {...defaultProps} />
      );

      const canvas = getByTestId('measurement-canvas');

      // Add three points
      fireEvent(canvas, 'onTouchStart', {
        nativeEvent: { locationX: 100, locationY: 100 },
      });

      fireEvent(canvas, 'onTouchStart', {
        nativeEvent: { locationX: 200, locationY: 100 },
      });

      fireEvent(canvas, 'onTouchStart', {
        nativeEvent: { locationX: 200, locationY: 200 },
      });

      expect(getByTestId('point-2')).toBeTruthy();

      const undoButton = getByTestId('undo-button');
      fireEvent.press(undoButton);

      expect(() => getByTestId('point-2')).toThrow();
      expect(getByTestId('point-1')).toBeTruthy();
    });

    it('should allow clearing all points', () => {
      const { getByTestId } = render(
        <MeasurementCapture {...defaultProps} />
      );

      const canvas = getByTestId('measurement-canvas');

      // Add points
      fireEvent(canvas, 'onTouchStart', {
        nativeEvent: { locationX: 100, locationY: 100 },
      });

      fireEvent(canvas, 'onTouchStart', {
        nativeEvent: { locationX: 200, locationY: 100 },
      });

      const clearButton = getByTestId('clear-button');
      fireEvent.press(clearButton);

      expect(() => getByTestId('point-0')).toThrow();
      expect(() => getByTestId('point-1')).toThrow();
    });

    it('should confirm before clearing all points', () => {
      const { getByTestId } = render(
        <MeasurementCapture {...defaultProps} />
      );

      const canvas = getByTestId('measurement-canvas');

      // Add points
      fireEvent(canvas, 'onTouchStart', {
        nativeEvent: { locationX: 100, locationY: 100 },
      });

      const clearButton = getByTestId('clear-button');
      fireEvent.press(clearButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Clear Measurements',
        'Are you sure you want to clear all measurements?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Clear' }),
        ])
      );
    });
  });
});
