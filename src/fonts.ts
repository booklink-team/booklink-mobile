// Bundled Rubik weights 400/700, including Cyrillic.
export const fonts = {
  RubikRegular: require("../assets/fonts/Rubik-Regular.ttf"),
  RubikBold: require("../assets/fonts/Rubik-Bold.ttf"),
};

export function fontFamily(weight: string | number | undefined) {
  return weight === "bold" || Number(weight) >= 600
    ? "RubikBold"
    : "RubikRegular";
}
