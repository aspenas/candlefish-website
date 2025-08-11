// Stub module for cloudinary
// This is used during build when the actual dependency is not installed

export const v2 = {
  config: (_config: any) => {},
  uploader: {
    upload_stream: (_options: any, _callback: any) => {
      return {
        end: (_buffer: any) => {}
      };
    }
  }
};

console.warn('Using stub Cloudinary client - install cloudinary for full functionality');
