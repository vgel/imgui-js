// Mini memory editor for Dear ImGui (to embed in your game/tools)
// Animated GIF: https://twitter.com/ocornut/status/894242704317530112
// Get latest version at http://www.github.com/ocornut/imgui_club
//
// You can adjust the keyboard repeat delay/rate in ImGuiIO.
// The code assume a mono-space font for simplicity! If you don't use the default font, use ImGui.PushFont()/PopFont() to switch to a mono-space font before caling this.
//
// Usage:
//   static MemoryEditor mem_edit_1;                                            // store your state somewhere
//   mem_edit_1.DrawWindow("Memory Editor", mem_block, mem_block_size, 0x0000); // create a window and draw memory editor (if you already have a window, use DrawContents())
//
// Usage:
//   static MemoryEditor mem_edit_2;
//   ImGui.Begin("MyWindow")
//   mem_edit_2.DrawContents(this, sizeof(*this), (size_t)this);
//   ImGui.End();
//
// Changelog:
// - v0.10: initial version
// - v0.11: always refresh active text input with the latest byte from source memory if it's not being edited.
// - v0.12: added this.OptMidRowsCount to allow extra spacing every XX rows.
// - v0.13: added optional ReadFn/WriteFn handlers to access memory via a function. various warning fixes for 64-bits.
// - v0.14: added GotoAddr member, added GotoAddrAndHighlight() and highlighting. fixed minor scrollbar glitch when resizing.
// - v0.15: added maximum window width. minor optimization.
// - v0.16: added OptGreyOutZeroes option. various sizing fixes when resizing using the "Rows" drag.
// - v0.17: added HighlightFn handler for optional non-contiguous highlighting.
// - v0.18: fixes for displaying 64-bits addresses, fixed mouse click gaps introduced in recent changes, cursor tracking scrolling fixes.
// - v0.19: fixed auto-focus of next byte leaving WantCaptureKeyboard=false for one frame. we now capture the keyboard during that transition.
// - v0.20: added options menu. added this.OptShowAscii checkbox. added optional HexII display. split Draw() in DrawWindow()/DrawContents(). fixing glyph width. refactoring/cleaning code.
// - v0.21: fixes for using DrawContents() in our own window. fixed HexII to actually be useful and not on the wrong side.
// - v0.22: clicking Ascii view select the byte in the Hex view. Ascii view highlight selection.
// - v0.23: fixed right-arrow triggering a byte write
//
// Todo/Bugs:
// - Arrows are being sent to the InputText() about to disappear which for LeftArrow makes the text cursor appear at position 1 for one frame.
System.register(["./imgui"], function (exports_1, context_1) {
    "use strict";
    var ImGui, imgui_1, imgui_2, imgui_3, imgui_4, imgui_5, imgui_6, MemoryEditor;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (ImGui_1) {
                ImGui = ImGui_1;
                imgui_1 = ImGui_1;
                imgui_2 = ImGui_1;
                imgui_3 = ImGui_1;
                imgui_4 = ImGui_1;
                imgui_5 = ImGui_1;
                imgui_6 = ImGui_1;
            }
        ],
        execute: function () {
            MemoryEditor = class MemoryEditor {
                constructor() {
                    // typedef unsigned char u8;
                    // Settings
                    // bool            Open;                                   // = true   // set to false when DrawWindow() was closed. ignore if not using DrawWindow
                    this.Open = false;
                    // bool            ReadOnly;                               // = false  // set to true to disable any editing
                    this.ReadOnly = false;
                    // int             Rows;                                   // = 16     //
                    this.Rows = 16;
                    // bool            OptShowAscii;                           // = true   //
                    this.OptShowAscii = true;
                    // bool            OptShowHexII;                           // = false  //
                    this.OptShowHexII = false;
                    // bool            OptGreyOutZeroes;                       // = true   //
                    this.OptGreyOutZeroes = true;
                    // int             OptMidRowsCount;                        // = 8      // set to 0 to disable extra spacing between every mid-rows
                    this.OptMidRowsCount = 8;
                    // int             OptAddrDigitsCount;                     // = 0      // number of addr digits to display (default calculated based on maximum displayed addr)
                    this.OptAddrDigitsCount = 0;
                    // ImU32           HighlightColor;                         //          // color of highlight
                    this.HighlightColor = ImGui.IM_COL32(255, 255, 255, 40);
                    // u8              (*ReadFn)(u8* data, size_t off);        // = NULL   // optional handler to read bytes
                    this.ReadFn = null;
                    // void            (*WriteFn)(u8* data, size_t off, u8 d); // = NULL   // optional handler to write bytes
                    this.WriteFn = null;
                    // bool            (*HighlightFn)(u8* data, size_t off);   // = NULL   // optional handler to return Highlight property (to support non-contiguous highlighting)
                    this.HighlightFn = null;
                    // State/Internals
                    // bool            ContentsWidthChanged;
                    this.ContentsWidthChanged = false;
                    // size_t          DataEditingAddr;
                    this.DataEditingAddr = -1;
                    // bool            DataEditingTakeFocus;
                    this.DataEditingTakeFocus = false;
                    // char            DataInputBuf[32];
                    this.DataInputBuf = new imgui_4.ImStringBuffer(32, "");
                    // char            AddrInputBuf[32];
                    this.AddrInputBuf = new imgui_4.ImStringBuffer(32, "");
                    // size_t          GotoAddr;
                    this.GotoAddr = -1;
                    // size_t          HighlightMin, HighlightMax;
                    this.HighlightMin = -1;
                    this.HighlightMax = -1;
                }
                GotoAddrAndHighlight(addr_min, addr_max) {
                    this.GotoAddr = addr_min;
                    this.HighlightMin = addr_min;
                    this.HighlightMax = addr_max;
                }
                // struct Sizes
                // {
                //     int     AddrDigitsCount;
                //     float   LineHeight;
                //     float   GlyphWidth;
                //     float   HexCellWidth;
                //     float   SpacingBetweenMidRows;
                //     float   PosHexStart;
                //     float   PosHexEnd;
                //     float   PosAsciiStart;
                //     float   PosAsciiEnd;
                //     float   WindowWidth;
                // };
                CalcSizes(s, mem_size, base_display_addr) {
                    const style = ImGui.GetStyle();
                    s.AddrDigitsCount = this.OptAddrDigitsCount;
                    if (s.AddrDigitsCount === 0)
                        for (let n = base_display_addr + mem_size - 1; n > 0; n >>= 4)
                            s.AddrDigitsCount++;
                    s.LineHeight = ImGui.GetTextLineHeight();
                    s.GlyphWidth = ImGui.CalcTextSize("F").x + 1; // We assume the font is mono-space
                    s.HexCellWidth = Math.floor(s.GlyphWidth * 2.5); // "FF " we include trailing space in the width to easily catch clicks everywhere
                    s.SpacingBetweenMidRows = Math.floor(s.HexCellWidth * 0.25); // Every this.OptMidRowsCount columns we add a bit of extra spacing
                    s.PosHexStart = (s.AddrDigitsCount + 2) * s.GlyphWidth;
                    s.PosHexEnd = s.PosHexStart + (s.HexCellWidth * this.Rows);
                    s.PosAsciiStart = s.PosAsciiEnd = s.PosHexEnd;
                    if (this.OptShowAscii) {
                        s.PosAsciiStart = s.PosHexEnd + s.GlyphWidth * 1;
                        if (this.OptMidRowsCount > 0)
                            s.PosAsciiStart += ((this.Rows + this.OptMidRowsCount - 1) / this.OptMidRowsCount) * s.SpacingBetweenMidRows;
                        s.PosAsciiEnd = s.PosAsciiStart + this.Rows * s.GlyphWidth;
                    }
                    s.WindowWidth = s.PosAsciiEnd + style.ScrollbarSize + style.WindowPadding.x * 2 + s.GlyphWidth;
                }
                // #ifdef _MSC_VER
                // #define _PRISizeT   "IX"
                // #else
                // #define _PRISizeT   "zX"
                // #endif
                static sprintf_PRISizeT(n, pad = 0) {
                    return ("0".repeat(pad) + n.toString(16).toUpperCase()).substr(-pad);
                }
                static sscanf_PRISizeT(s) {
                    return parseInt(s, 16);
                }
                // Standalone Memory Editor window
                DrawWindow(title, mem_data, mem_size = mem_data.byteLength, base_display_addr = 0x000) {
                    const s = new MemoryEditor.Sizes();
                    this.CalcSizes(s, mem_size, base_display_addr);
                    // ImGui.SetNextWindowSizeConstraints(new ImVec2(0.0, 0.0), new ImVec2(s.WindowWidth, FLT_MAX));
                    ImGui.SetNextWindowSizeConstraints(new imgui_5.ImVec2(0.0, 0.0), new imgui_5.ImVec2(s.WindowWidth, Number.MAX_VALUE));
                    // this.Open = true;
                    // if (ImGui.Begin(title, &Open, ImGuiWindowFlags_NoScrollbar))
                    if (ImGui.Begin(title, (value = this.Open) => this.Open = value, imgui_2.ImGuiWindowFlags.NoScrollbar)) {
                        if (ImGui.IsWindowHovered(imgui_3.ImGuiHoveredFlags.RootAndChildWindows) && ImGui.IsMouseClicked(1))
                            ImGui.OpenPopup("context");
                        this.DrawContents(mem_data, mem_size, base_display_addr);
                        if (this.ContentsWidthChanged) {
                            this.CalcSizes(s, mem_size, base_display_addr);
                            ImGui.SetWindowSize(new imgui_5.ImVec2(s.WindowWidth, ImGui.GetWindowSize().y));
                        }
                    }
                    ImGui.End();
                }
                // Memory Editor contents only
                DrawContents(mem_data, mem_size = mem_data.byteLength, base_display_addr = 0x0000) {
                    const s = new MemoryEditor.Sizes();
                    this.CalcSizes(s, mem_size, base_display_addr);
                    const style = ImGui.GetStyle();
                    const footer_height_to_reserve = ImGui.GetStyle().ItemSpacing.y + ImGui.GetFrameHeightWithSpacing(); // 1 separator, 1 input text
                    ImGui.BeginChild("##scrolling", new imgui_5.ImVec2(0, -footer_height_to_reserve));
                    const draw_list = ImGui.GetWindowDrawList();
                    ImGui.PushStyleVar(ImGui.StyleVar.FramePadding, new imgui_5.ImVec2(0, 0));
                    ImGui.PushStyleVar(ImGui.StyleVar.ItemSpacing, new imgui_5.ImVec2(0, 0));
                    const line_total_count = 0 | ((mem_size + this.Rows - 1) / this.Rows);
                    const clipper = new imgui_6.ImGuiListClipper(line_total_count, s.LineHeight);
                    const visible_start_addr = clipper.DisplayStart * this.Rows;
                    const visible_end_addr = clipper.DisplayEnd * this.Rows;
                    let data_next = false;
                    if (this.ReadOnly || this.DataEditingAddr >= mem_size)
                        this.DataEditingAddr = -1;
                    const data_editing_addr_backup = this.DataEditingAddr;
                    let data_editing_addr_next = -1;
                    if (this.DataEditingAddr !== -1) {
                        // Move cursor but only apply on next frame so scrolling with be synchronized (because currently we can't change the scrolling while the window is being rendered)
                        if (ImGui.IsKeyPressed(ImGui.GetKeyIndex(ImGui.Key.UpArrow)) && this.DataEditingAddr >= this.Rows) {
                            data_editing_addr_next = this.DataEditingAddr - this.Rows;
                            this.DataEditingTakeFocus = true;
                        }
                        else if (ImGui.IsKeyPressed(ImGui.GetKeyIndex(ImGui.Key.DownArrow)) && this.DataEditingAddr < mem_size - this.Rows) {
                            data_editing_addr_next = this.DataEditingAddr + this.Rows;
                            this.DataEditingTakeFocus = true;
                        }
                        else if (ImGui.IsKeyPressed(ImGui.GetKeyIndex(ImGui.Key.LeftArrow)) && this.DataEditingAddr > 0) {
                            data_editing_addr_next = this.DataEditingAddr - 1;
                            this.DataEditingTakeFocus = true;
                        }
                        else if (ImGui.IsKeyPressed(ImGui.GetKeyIndex(ImGui.Key.RightArrow)) && this.DataEditingAddr < mem_size - 1) {
                            data_editing_addr_next = this.DataEditingAddr + 1;
                            this.DataEditingTakeFocus = true;
                        }
                    }
                    if (data_editing_addr_next !== -1 && (data_editing_addr_next / this.Rows) !== (data_editing_addr_backup / this.Rows)) {
                        // Track cursor movements
                        const scroll_offset = (0 | (data_editing_addr_next / this.Rows) - 0 | (data_editing_addr_backup / this.Rows));
                        const scroll_desired = (scroll_offset < 0 && data_editing_addr_next < visible_start_addr + this.Rows * 2) || (scroll_offset > 0 && data_editing_addr_next > visible_end_addr - this.Rows * 2);
                        if (scroll_desired)
                            ImGui.SetScrollY(ImGui.GetScrollY() + scroll_offset * s.LineHeight);
                    }
                    // Draw vertical separator
                    const window_pos = ImGui.GetWindowPos();
                    if (this.OptShowAscii)
                        draw_list.AddLine(new imgui_5.ImVec2(window_pos.x + s.PosAsciiStart - s.GlyphWidth, window_pos.y), new imgui_5.ImVec2(window_pos.x + s.PosAsciiStart - s.GlyphWidth, window_pos.y + 9999), ImGui.GetColorU32(imgui_1.ImGuiCol.Border));
                    const color_text = ImGui.GetColorU32(imgui_1.ImGuiCol.Text);
                    const color_disabled = this.OptGreyOutZeroes ? ImGui.GetColorU32(imgui_1.ImGuiCol.TextDisabled) : color_text;
                    for (let line_i = clipper.DisplayStart; line_i < clipper.DisplayEnd; line_i++) // display only visible lines
                     {
                        let addr = (line_i * this.Rows);
                        // ImGui.Text("%0*" _PRISizeT ": ", s.AddrDigitsCount, base_display_addr + addr);
                        ImGui.Text(`${MemoryEditor.sprintf_PRISizeT(base_display_addr + addr, s.AddrDigitsCount)}: `);
                        // Draw Hexadecimal
                        for (let n = 0; n < this.Rows && addr < mem_size; n++, addr++) {
                            let byte_pos_x = s.PosHexStart + s.HexCellWidth * n;
                            if (this.OptMidRowsCount > 0)
                                byte_pos_x += (n / this.OptMidRowsCount) * s.SpacingBetweenMidRows;
                            ImGui.SameLine(byte_pos_x);
                            // Draw highlight
                            if ((addr >= this.HighlightMin && addr < this.HighlightMax) || (this.HighlightFn && this.HighlightFn(mem_data, addr))) {
                                const pos = ImGui.GetCursorScreenPos();
                                let highlight_width = s.GlyphWidth * 2;
                                const is_next_byte_highlighted = (addr + 1 < mem_size) && ((this.HighlightMax !== -1 && addr + 1 < this.HighlightMax) || (this.HighlightFn && this.HighlightFn(mem_data, addr + 1) || false));
                                if (is_next_byte_highlighted || (n + 1 === this.Rows)) {
                                    highlight_width = s.HexCellWidth;
                                    if (this.OptMidRowsCount > 0 && n > 0 && (n + 1) < this.Rows && ((n + 1) % this.OptMidRowsCount) === 0)
                                        highlight_width += s.SpacingBetweenMidRows;
                                }
                                draw_list.AddRectFilled(pos, new imgui_5.ImVec2(pos.x + highlight_width, pos.y + s.LineHeight), this.HighlightColor);
                            }
                            if (this.DataEditingAddr === addr) {
                                // Display text input on current byte
                                let data_write = false;
                                ImGui.PushID(addr);
                                // sprintf(AddrInputBuf, "%0*" _PRISizeT, s.AddrDigitsCount, base_display_addr + addr);
                                this.AddrInputBuf.buffer = MemoryEditor.sprintf_PRISizeT(base_display_addr + addr, s.AddrDigitsCount);
                                // sprintf(DataInputBuf, "%02X", ReadFn ? ReadFn(mem_data, addr) : mem_data[addr]);
                                this.DataInputBuf.buffer = MemoryEditor.sprintf_PRISizeT(this.ReadFn ? this.ReadFn(mem_data, addr) : new Uint8Array(mem_data)[addr], 2);
                                if (this.DataEditingTakeFocus) {
                                    ImGui.SetKeyboardFocusHere();
                                    ImGui.CaptureKeyboardFromApp(true);
                                    // sprintf(AddrInputBuf, "%0*" _PRISizeT, s.AddrDigitsCount, base_display_addr + addr);
                                    // this.AddrInputBuf.buffer = MemoryEditor.sprintf_PRISizeT(base_display_addr + addr, s.AddrDigitsCount);
                                    // sprintf(DataInputBuf, "%02X", ReadFn ? ReadFn(mem_data, addr) : mem_data[addr]);
                                    // this.DataInputBuf.buffer = MemoryEditor.sprintf_PRISizeT(this.ReadFn ? this.ReadFn(mem_data, addr) : new Uint8Array(mem_data)[addr], 2);
                                }
                                ImGui.PushItemWidth(s.GlyphWidth * 2);
                                // struct UserData
                                // {
                                //     // FIXME: We should have a way to retrieve the text edit cursor position more easily in the API, this is rather tedious. This is such a ugly mess we may be better off not using InputText() at all here.
                                //     static int Callback(ImGuiTextEditCallbackData* data)
                                //     {
                                //         UserData* user_data = (UserData*)data->UserData;
                                //         if (!data->HasSelection())
                                //             user_data->CursorPos = data->CursorPos;
                                //         if (data->SelectionStart === 0 && data->SelectionEnd === data->BufTextLen)
                                //         {
                                //             // When not editing a byte, always rewrite its content (this is a bit tricky, since InputText technically "owns" the master copy of the buffer we edit it in there)
                                //             data->DeleteChars(0, data->BufTextLen);
                                //             data->InsertChars(0, user_data->CurrentBufOverwrite);
                                //             data->SelectionStart = 0;
                                //             data->SelectionEnd = data->CursorPos = 2;
                                //         }
                                //         return 0;
                                //     }
                                //     char   CurrentBufOverwrite[3];  // Input
                                //     int    CursorPos;               // Output
                                // };
                                // FIXME: We should have a way to retrieve the text edit cursor position more easily in the API, this is rather tedious. This is such a ugly mess we may be better off not using InputText() at all here.
                                let UserData_Callback = (data) => {
                                    const user_data = data.UserData;
                                    if (!data.HasSelection())
                                        user_data.CursorPos = data.CursorPos;
                                    if (data.SelectionStart === 0 && data.SelectionEnd === data.BufTextLen) {
                                        // When not editing a byte, always rewrite its content (this is a bit tricky, since InputText technically "owns" the master copy of the buffer we edit it in there)
                                        data.DeleteChars(0, data.BufTextLen);
                                        data.InsertChars(0, user_data.CurrentBufOverwrite);
                                        data.SelectionStart = 0;
                                        data.SelectionEnd = data.CursorPos = 2;
                                    }
                                    return 0;
                                };
                                // UserData user_data;
                                // user_data.CursorPos = -1;
                                const user_data = {
                                    CurrentBufOverwrite: "",
                                    CursorPos: -1
                                };
                                // sprintf(user_data.CurrentBufOverwrite, "%02X", ReadFn ? ReadFn(mem_data, addr) : mem_data[addr]);
                                user_data.CurrentBufOverwrite = MemoryEditor.sprintf_PRISizeT(this.ReadFn ? this.ReadFn(mem_data, addr) : new Uint8Array(mem_data)[addr], 2);
                                const flags = ImGui.InputTextFlags.CharsHexadecimal | ImGui.InputTextFlags.EnterReturnsTrue | ImGui.InputTextFlags.AutoSelectAll | ImGui.InputTextFlags.NoHorizontalScroll | ImGui.InputTextFlags.AlwaysInsertMode | ImGui.InputTextFlags.CallbackAlways;
                                // if (ImGui.InputText("##data", DataInputBuf, 32, flags, UserData::Callback, &user_data))
                                if (ImGui.InputText("##data", this.DataInputBuf, this.DataInputBuf.size, flags, UserData_Callback, user_data))
                                    data_write = data_next = true;
                                else if (!this.DataEditingTakeFocus && !ImGui.IsItemActive())
                                    this.DataEditingAddr = data_editing_addr_next = -1;
                                this.DataEditingTakeFocus = false;
                                ImGui.PopItemWidth();
                                if (user_data.CursorPos >= 2)
                                    data_write = data_next = true;
                                if (data_editing_addr_next !== -1)
                                    data_write = data_next = false;
                                // int data_input_value;
                                // if (data_write && sscanf(DataInputBuf, "%X", &data_input_value) === 1)
                                if (data_write) {
                                    let data_input_value = MemoryEditor.sscanf_PRISizeT(this.DataInputBuf.buffer);
                                    if (this.WriteFn)
                                        // WriteFn(mem_data, addr, (u8)data_input_value);
                                        this.WriteFn(mem_data, addr, data_input_value);
                                    else
                                        // mem_data[addr] = (u8)data_input_value;
                                        new Uint8Array(mem_data)[addr] = data_input_value;
                                }
                                ImGui.PopID();
                            }
                            else {
                                // NB: The trailing space is not visible but ensure there's no gap that the mouse cannot click on.
                                // u8 b = ReadFn ? ReadFn(mem_data, addr) : mem_data[addr];
                                const b = this.ReadFn ? this.ReadFn(mem_data, addr) : new Uint8Array(mem_data)[addr];
                                if (this.OptShowHexII) {
                                    if ((b >= 32 && b < 128))
                                        // ImGui.Text(".%c ", b);
                                        ImGui.Text(`.${String.fromCharCode(b)} `);
                                    else if (b === 0xFF && this.OptGreyOutZeroes)
                                        ImGui.TextDisabled("## ");
                                    else if (b === 0x00)
                                        ImGui.Text("   ");
                                    else
                                        // ImGui.Text("%02X ", b);
                                        // ImGui.Text(`${("00" + b.toString(16).toUpperCase()).substr(-2)} `);
                                        ImGui.Text(`${MemoryEditor.sprintf_PRISizeT(b, 2)} `);
                                }
                                else {
                                    if (b === 0 && this.OptGreyOutZeroes)
                                        ImGui.TextDisabled("00 ");
                                    else
                                        // ImGui.Text("%02X ", b);
                                        // ImGui.Text(`${("00" + b.toString(16).toUpperCase()).substr(-2)} `);
                                        ImGui.Text(`${MemoryEditor.sprintf_PRISizeT(b, 2)} `);
                                }
                                if (!this.ReadOnly && ImGui.IsItemHovered() && ImGui.IsMouseClicked(0)) {
                                    this.DataEditingTakeFocus = true;
                                    data_editing_addr_next = addr;
                                }
                            }
                        }
                        if (this.OptShowAscii) {
                            // Draw ASCII values
                            ImGui.SameLine(s.PosAsciiStart);
                            const pos = ImGui.GetCursorScreenPos();
                            addr = line_i * this.Rows;
                            ImGui.PushID(line_i);
                            if (ImGui.InvisibleButton("ascii", new imgui_5.ImVec2(s.PosAsciiEnd - s.PosAsciiStart, s.LineHeight))) {
                                this.DataEditingAddr = addr + ((ImGui.GetIO().MousePos.x - pos.x) / s.GlyphWidth);
                                this.DataEditingTakeFocus = true;
                            }
                            ImGui.PopID();
                            for (let n = 0; n < this.Rows && addr < mem_size; n++, addr++) {
                                if (addr === this.DataEditingAddr) {
                                    draw_list.AddRectFilled(pos, new imgui_5.ImVec2(pos.x + s.GlyphWidth, pos.y + s.LineHeight), ImGui.GetColorU32(imgui_1.ImGuiCol.FrameBg));
                                    draw_list.AddRectFilled(pos, new imgui_5.ImVec2(pos.x + s.GlyphWidth, pos.y + s.LineHeight), ImGui.GetColorU32(imgui_1.ImGuiCol.TextSelectedBg));
                                }
                                // unsigned char c = ReadFn ? ReadFn(mem_data, addr) : mem_data[addr];
                                const c = this.ReadFn ? this.ReadFn(mem_data, addr) : new Uint8Array(mem_data)[addr];
                                // char display_c = (c < 32 || c >= 128) ? '.' : c;
                                const display_c = (c < 32 || c >= 128) ? "." : String.fromCharCode(c);
                                // draw_list->AddText(pos, (display_c === '.') ? color_disabled : color_text, &display_c, &display_c + 1);
                                draw_list.AddText(pos, (display_c === ".") ? color_disabled : color_text, display_c);
                                pos.x += s.GlyphWidth;
                            }
                        }
                    }
                    clipper.End();
                    clipper.delete();
                    ImGui.PopStyleVar(2);
                    ImGui.EndChild();
                    if (data_next && this.DataEditingAddr < mem_size) {
                        this.DataEditingAddr = this.DataEditingAddr + 1;
                        this.DataEditingTakeFocus = true;
                    }
                    else if (data_editing_addr_next !== -1) {
                        this.DataEditingAddr = data_editing_addr_next;
                    }
                    ImGui.Separator();
                    // Options menu
                    if (ImGui.Button("Options"))
                        ImGui.OpenPopup("context");
                    if (ImGui.BeginPopup("context")) {
                        ImGui.PushItemWidth(56);
                        // if (ImGui.DragInt("##rows", &Rows, 0.2f, 4, 32, "%.0f rows")) ContentsWidthChanged = true;
                        if (ImGui.DragInt("##rows", (_ = this.Rows) => this.Rows = _, 0.2, 4, 32, "%.0f rows"))
                            this.ContentsWidthChanged = true;
                        ImGui.PopItemWidth();
                        // ImGui.Checkbox("Show HexII", &OptShowHexII);
                        ImGui.Checkbox("Show HexII", (_ = this.OptShowHexII) => this.OptShowHexII = _);
                        // if (ImGui.Checkbox("Show Ascii", &this.OptShowAscii)) ContentsWidthChanged = true;
                        if (ImGui.Checkbox("Show Ascii", (_ = this.OptShowAscii) => this.OptShowAscii = _))
                            this.ContentsWidthChanged = true;
                        // ImGui.Checkbox("Grey out zeroes", &OptGreyOutZeroes);
                        ImGui.Checkbox("Grey out zeroes", (_ = this.OptGreyOutZeroes) => this.OptGreyOutZeroes = _);
                        ImGui.EndPopup();
                    }
                    ImGui.SameLine();
                    // ImGui.Text("Range %0*" _PRISizeT "..%0*" _PRISizeT, s.AddrDigitsCount, base_display_addr, s.AddrDigitsCount, base_display_addr + mem_size - 1);
                    ImGui.Text(`Range ${MemoryEditor.sprintf_PRISizeT(base_display_addr, s.AddrDigitsCount)}..${MemoryEditor.sprintf_PRISizeT(base_display_addr + mem_size - 1, s.AddrDigitsCount)}`);
                    ImGui.SameLine();
                    ImGui.PushItemWidth((s.AddrDigitsCount + 1) * s.GlyphWidth + style.FramePadding.x * 2.0);
                    // if (ImGui.InputText("##addr", AddrInputBuf, 32, ImGuiInputTextFlags_CharsHexadecimal | ImGuiInputTextFlags_EnterReturnsTrue))
                    if (ImGui.InputText("##addr", this.AddrInputBuf, this.AddrInputBuf.size, ImGui.InputTextFlags.CharsHexadecimal | ImGui.InputTextFlags.EnterReturnsTrue)) {
                        // size_t goto_addr;
                        const goto_addr = MemoryEditor.sscanf_PRISizeT(this.AddrInputBuf.buffer);
                        console.log("goto_addr", goto_addr.toString(16));
                        // if (sscanf(AddrInputBuf, "%" _PRISizeT, &goto_addr) === 1)
                        // {
                        this.GotoAddr = goto_addr - base_display_addr;
                        this.HighlightMin = this.HighlightMax = -1;
                        // }
                    }
                    ImGui.PopItemWidth();
                    if (this.GotoAddr !== -1) {
                        if (this.GotoAddr < mem_size) {
                            ImGui.BeginChild("##scrolling");
                            ImGui.SetScrollFromPosY(ImGui.GetCursorStartPos().y + (this.GotoAddr / this.Rows) * ImGui.GetTextLineHeight());
                            ImGui.EndChild();
                            this.DataEditingAddr = this.GotoAddr;
                            this.DataEditingTakeFocus = true;
                        }
                        this.GotoAddr = -1;
                    }
                    // Notify the main window of our ideal child content size (FIXME: we are missing an API to get the contents size from the child)
                    ImGui.SetCursorPosX(s.WindowWidth);
                }
            };
            exports_1("MemoryEditor", MemoryEditor);
            (function (MemoryEditor) {
                class Sizes {
                    constructor() {
                        this.AddrDigitsCount = 0;
                        this.LineHeight = 0.0;
                        this.GlyphWidth = 0.0;
                        this.HexCellWidth = 0.0;
                        this.SpacingBetweenMidRows = 0.0;
                        this.PosHexStart = 0.0;
                        this.PosHexEnd = 0.0;
                        this.PosAsciiStart = 0.0;
                        this.PosAsciiEnd = 0.0;
                        this.WindowWidth = 0.0;
                    }
                }
                MemoryEditor.Sizes = Sizes;
            })(MemoryEditor || (MemoryEditor = {}));
            exports_1("MemoryEditor", MemoryEditor);
        }
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1ndWlfbWVtb3J5X2VkaXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImltZ3VpX21lbW9yeV9lZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsa0VBQWtFO0FBQ2xFLHNFQUFzRTtBQUN0RSxpRUFBaUU7QUFDakUsRUFBRTtBQUNGLDREQUE0RDtBQUM1RCx5S0FBeUs7QUFDekssRUFBRTtBQUNGLFNBQVM7QUFDVCw2R0FBNkc7QUFDN0csNEtBQTRLO0FBQzVLLEVBQUU7QUFDRixTQUFTO0FBQ1Qsb0NBQW9DO0FBQ3BDLDRCQUE0QjtBQUM1QixnRUFBZ0U7QUFDaEUsaUJBQWlCO0FBQ2pCLEVBQUU7QUFDRixhQUFhO0FBQ2IsMkJBQTJCO0FBQzNCLDhHQUE4RztBQUM5Ryw0RUFBNEU7QUFDNUUsc0hBQXNIO0FBQ3RILDZIQUE2SDtBQUM3SCwyREFBMkQ7QUFDM0Qsb0dBQW9HO0FBQ3BHLCtFQUErRTtBQUMvRSx5SUFBeUk7QUFDekksOElBQThJO0FBQzlJLDJMQUEyTDtBQUMzTCwwSEFBMEg7QUFDMUgsZ0dBQWdHO0FBQ2hHLHFEQUFxRDtBQUNyRCxFQUFFO0FBQ0YsYUFBYTtBQUNiLDhJQUE4STs7Ozs7Ozs7Ozs7Ozs7Ozs7O1lBaUI5SSxlQUFBLE1BQWEsWUFBWTtnQkFBekI7b0JBRUksNEJBQTRCO29CQUU1QixXQUFXO29CQUNYLG1KQUFtSjtvQkFDNUksU0FBSSxHQUFZLEtBQUssQ0FBQztvQkFDN0IsNEdBQTRHO29CQUNyRyxhQUFRLEdBQVksS0FBSyxDQUFDO29CQUNqQyx5RUFBeUU7b0JBQ2xFLFNBQUksR0FBVyxFQUFFLENBQUM7b0JBQ3pCLHlFQUF5RTtvQkFDbEUsaUJBQVksR0FBWSxJQUFJLENBQUM7b0JBQ3BDLHlFQUF5RTtvQkFDbEUsaUJBQVksR0FBWSxLQUFLLENBQUM7b0JBQ3JDLHlFQUF5RTtvQkFDbEUscUJBQWdCLEdBQVksSUFBSSxDQUFDO29CQUN4QyxrSUFBa0k7b0JBQzNILG9CQUFlLEdBQVcs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