import { ImAccess } from "./imgui";
import { ImScalar } from "./imgui";
import { ImGuiStyle } from "./imgui";
export declare function ShowUserGuide(): void;
export declare function ShowDemoWindow(p_open?: ImAccess<boolean> | ImScalar<boolean> | null): boolean;
export declare function ShowStyleSelector(label: string): boolean;
export declare function ShowFontSelector(label: string): void;
export declare function ShowStyleEditor(ref?: ImGuiStyle | null): void;
