// Public Firebase web config.
// Fill these with your actual Firebase project values OR leave empty to rely on VITE_ env vars.
// These values are NOT secrets (Firebase client config is public). Keeping them here lets GitHub Pages build work
// even without defining GitHub Action secrets. If both env vars and these constants exist, env vars WIN.
export const firebasePublicConfig = {
  apiKey: '<FIREBASE_API_KEY>',
  authDomain: '<your-project-id>.firebaseapp.com',
  projectId: '<your-project-id>',
  appId: '<FIREBASE_APP_ID>',
  messagingSenderId: '<FIREBASE_MESSAGING_SENDER_ID>',
  storageBucket: '<your-project-id>.appspot.com',
  // Optional
  measurementId: '<G-XXXXXXX>'
};
