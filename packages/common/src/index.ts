const FAIL_CHANCE =  0.995;

export function failRandomly() {
  if (Math.random() > FAIL_CHANCE) {
    throw new Error("RANDOM");
  }
}
