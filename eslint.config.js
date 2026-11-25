import { monorise } from "@monorise-team/config/eslint";

// Pliki w katalogu głównym (skrypty, konfiguracje); aplikacje mają własne eslint.config.js.
export default monorise({ ignores: ["apps/**"], tsconfigRootDir: import.meta.dirname });
