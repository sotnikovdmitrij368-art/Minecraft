import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  // ДОБАВЛЯЕМ ЭТОТ БЛОК ДЛЯ СВЯЗИ С ТЕЛЕФОНОМ:
  server: {
    host: true, // Открывает доступ к серверу по локальной сети Wi-Fi
    port: 3000, // Задает фиксированный порт (можно любой, например 3000)
  },
});
