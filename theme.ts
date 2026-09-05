import { loadFont as loadArchivo } from "@remotion/google-fonts/Archivo";
import { loadFont as loadManrope } from "@remotion/google-fonts/Manrope";

export const { fontFamily: displayFont } = loadArchivo("normal", {
  weights: ["700", "900"],
  subsets: ["latin"],
});

export const { fontFamily: bodyFont } = loadManrope("normal", {
  weights: ["400", "600", "800"],
  subsets: ["latin"],
});

export const colors = {
  bg: "#0B1F17",
  bg2: "#0E2A1E",
  card: "#123526",
  emerald: "#10B981",
  gold: "#F5C04A",
  cream: "#F3EFE6",
  muted: "#8FB3A3",
  red: "#F87171",
};
