# Deployment Runbook

## 1) Android build (Expo / EAS)

Run from Windows `cmd` at project root:

```bat
npm install
npx expo start
eas whoami
eas build --platform android --profile preview
```

If `eas` is not installed globally:

```bat
npx eas-cli build --platform android --profile preview
```

## 2) Firebase deploy

Project ID: `luctfacultyapp-8edb0`

Deploy hosting + Firestore rules:

```bat
npx firebase deploy --only firestore:rules,hosting
```

Deploy functions too (requires Blaze billing plan):

```bat
npx firebase deploy --only functions
```

## 3) Netlify deploy

Production deploy (authenticated account):

```bat
npx netlify deploy --prod --dir=dist
```

If not logged in, login first:

```bat
npx netlify login
```

Anonymous one-off deploy:

```bat
npx netlify deploy --dir=dist --allow-anonymous
```
