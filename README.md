# Gitleak Scan Action

Acción de GitHub para escanear repositorios en busca de secretos y credenciales expuestos usando [Gitleaks](https://github.com/gitleaks/gitleaks).

## Descripción

Esta acción ejecuta Gitleaks para detectar posibles filtraciones de secretos (API keys, contraseñas, tokens, etc.) en el código fuente, protegiendo la seguridad de los repositorios.

## Características

- 🔑 Detección automática de secretos y credenciales expuestos
- 📄 Soporte para configuración personalizada de reglas y exclusiones
- 📝 Genera reportes en formato JSON y SARIF para integración con GitHub Security
- 🚦 Falla el workflow si se detectan secretos críticos
- ⚡ Escaneo rápido de todo el historial o solo cambios recientes

## Parámetros de entrada

- **config**: Ruta al archivo de configuración de Gitleaks (opcional)
- **report-format**: Formato del reporte (`json`, `sarif`). Por defecto: `json`
- **fail-on-detect**: Si debe fallar el workflow al detectar secretos (`true` o `false`). Por defecto: `true`
- **scan-all**: Si debe escanear todo el historial (`true`) o solo los cambios recientes (`false`). Por defecto: `false`

## Ejemplo de uso

```yaml
jobs:
  gitleaks-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Escanear secretos con Gitleaks
        uses: ./gitleak-scan
        with:
          config: './gitleaks.toml'
          report-format: 'sarif'
          fail-on-detect: true
          scan-all: false

      - name: Subir reporte de Gitleaks
        uses: actions/upload-artifact@v4
        with:
          name: gitleaks-report
          path: gitleaks-report.sarif
```

## Notas

- Puedes personalizar las reglas de escaneo creando tu propio archivo `gitleaks.toml`.
- El reporte SARIF puede ser subido a GitHub Security para visualización en la pestaña de Security.
- Si se detectan secretos, el workflow fallará automáticamente si `fail-on-detect` está en `true`.

---
DevOps Mario Fribla Gonzalez

