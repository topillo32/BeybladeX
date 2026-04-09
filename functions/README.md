# Cloud Functions (opcional)

Operaciones muy sensibles (por ejemplo validar solo desde servidor, webhooks o jobs programados) pueden ir aquí.

Para añadir Functions al proyecto:

```bash
cd functions
npm init -y
npm install firebase-functions firebase-admin
```

Define funciones HTTPS o Firestore en `index.js` / `index.ts` y despliega con:

```bash
firebase deploy --only functions
```

Las reglas de Firestore y la lógica en `src/services` cubren el caso actual; Functions son un siguiente paso si necesitas secretos de servidor o lógica que no debe confiarse al cliente.
