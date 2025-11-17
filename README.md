# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. **⚠️ Configurar variables de entorno (REQUERIDO)**

   Copia el archivo `.env.example` como `.env` y configura tus credenciales:

   ```bash
   cp .env.example .env
   ```

   Luego edita `.env` con tus credenciales reales:
   - **EXPO_PUBLIC_GEMINI_API_KEY**: API Key de Google Gemini (obtener en [AI Studio](https://aistudio.google.com/app/apikey))
   - **EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID**: Client ID para iOS (obtener en [Google Cloud Console](https://console.cloud.google.com/apis/credentials))
   - **EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID**: Client ID para Android
   - **EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID**: Client ID para Web

   **🚨 IMPORTANTE**: Nunca subas el archivo `.env` al repositorio. Mantén tus credenciales seguras.

3. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## 🔒 Seguridad

### Variables de Entorno
- **NUNCA** subas el archivo `.env` al repositorio
- Usa `.env.example` como plantilla para nuevos desarrolladores
- Todas las credenciales sensibles deben estar en variables de entorno
- El proyecto validará automáticamente que las variables estén configuradas

### Archivos Sensibles
Los siguientes archivos están en `.gitignore` y no deben subirse:
- `.env`
- `.env.local`
- `*.key`
- `*.p8`
- `*.p12`
- `*.jks`

### APIs Utilizadas
- **Google Gemini AI**: Requiere API Key
- **Google OAuth**: Requiere Client IDs para iOS, Android y Web
- **Google Calendar**: Integración con calendario

### Rotación de Credenciales
Si sospechas que una credencial fue comprometida:
1. Regenera la API Key/Client ID inmediatamente
2. Actualiza tu archivo `.env`
3. Reinicia la aplicación
