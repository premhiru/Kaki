import type { KakiRuntimeOwners } from "./contracts.js";

export type KakiRuntimeOwnerInstallation = Readonly<{ release(): void }>;
export type KakiRuntimeOwnerBinding = Readonly<{
  householdProfileId: string;
  owners: KakiRuntimeOwners;
}>;

/** Single Gateway-process owner slot; adapters install once and release on their lifecycle stop. */
export class KakiRuntimeOwnerRegistry {
  private binding?: KakiRuntimeOwnerBinding;

  install(binding: KakiRuntimeOwnerBinding): KakiRuntimeOwnerInstallation {
    if (!binding.householdProfileId.trim()) {
      throw new Error("Kaki runtime owner binding requires a household profile id");
    }
    if (this.binding) {
      throw new Error("Kaki runtime owners are already installed");
    }
    this.binding = binding;
    let released = false;
    return {
      release: () => {
        if (released) return;
        released = true;
        if (this.binding === binding) this.binding = undefined;
      },
    };
  }

  current(householdProfileId: string): KakiRuntimeOwners | undefined {
    return this.binding?.householdProfileId === householdProfileId
      ? this.binding.owners
      : undefined;
  }
}

const defaultRegistry = new KakiRuntimeOwnerRegistry();

/** Install the authoritative Kaki owners before enabling the bundled plugin. */
export function installKakiRuntimeOwners(
  binding: KakiRuntimeOwnerBinding,
): KakiRuntimeOwnerInstallation {
  return defaultRegistry.install(binding);
}

export function resolveInstalledKakiRuntimeOwners(
  householdProfileId: string,
): KakiRuntimeOwners | undefined {
  return defaultRegistry.current(householdProfileId);
}
