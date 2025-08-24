// Mock for react-native-camera
export const RNCamera = {
  Constants: {
    Aspect: {
      fill: 'fill',
      fit: 'fit',
      stretch: 'stretch',
    },
    BarCodeType: {
      qr: 'qr',
      pdf417: 'pdf417',
      aztec: 'aztec',
      ean13: 'ean13',
      ean8: 'ean8',
      upc_e: 'upc_e',
      code39: 'code39',
      code93: 'code93',
      code128: 'code128',
      codabar: 'codabar',
      itf14: 'itf14',
      interleaved2of5: 'interleaved2of5',
    },
    CameraStatus: {
      READY: 'READY',
      PENDING_AUTHORIZATION: 'PENDING_AUTHORIZATION',
      NOT_AUTHORIZED: 'NOT_AUTHORIZED',
    },
    Type: {
      front: 'front',
      back: 'back',
    },
  },
};

export default {
  RNCamera,
  takePictureAsync: jest.fn(() => Promise.resolve({
    uri: 'mock://photo.jpg',
    width: 1920,
    height: 1080,
    base64: 'mock-base64-string'
  })),
};
