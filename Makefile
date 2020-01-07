# This file only builds bind-imgui.js.
# To build the JS modules, use npm run build

SOURCEMAP_BASE = http://localhost:8080
BUILD = build

BIND_IMGUI_OUTPUT_BC = $(BUILD)/bind-imgui.bc
BIND_IMGUI_OUTPUT_JS = bind-imgui.js

IMGUI_PATH = imgui
IMGUI_SOURCE_HXX += $(IMGUI_PATH)/imconfig.h
IMGUI_SOURCE_HXX += $(IMGUI_PATH)/imgui.h
IMGUI_SOURCE_HXX += $(IMGUI_PATH)/imgui_internal.h
IMGUI_SOURCE_HXX += $(IMGUI_PATH)/imstb_rectpack.h
IMGUI_SOURCE_HXX += $(IMGUI_PATH)/imstb_textedit.h
IMGUI_SOURCE_HXX += $(IMGUI_PATH)/imstb_truetype.h
IMGUI_SOURCE_CXX += $(IMGUI_PATH)/imgui.cpp
IMGUI_SOURCE_CXX += $(IMGUI_PATH)/imgui_demo.cpp
IMGUI_SOURCE_CXX += $(IMGUI_PATH)/imgui_draw.cpp
IMGUI_SOURCE_CXX += $(IMGUI_PATH)/imgui_widgets.cpp
IMGUI_OUTPUT_BC = $(IMGUI_SOURCE_CXX:%.cpp=$(BUILD)/%.bc)

# debug flags
# FLAGS += -g4
# FLAGS += -O0
# FLAGS += --source-map-base $(SOURCEMAP_BASE)
# FLAGS += -s ASSERTIONS=1
# FLAGS += -s SAFE_HEAP=1

FLAGS += -Os
FLAGS += -s NO_FILESYSTEM=1
# FLAGS += -s WASM=1
FLAGS += -s MODULARIZE=1
# FLAGS += -s EXPORT_NAME=\"ImGui\"
FLAGS += -s EXPORT_BINDINGS=1
# FLAGS += -s EXPORT_ALL=1
# FLAGS += -s MEM_INIT_METHOD=0
# FLAGS += --memory-init-file 0
FLAGS += -s SINGLE_FILE=1
# FLAGS += -s BINARYEN_ASYNC_COMPILATION=0
# FLAGS += -s BINARYEN_METHOD=\"native-wasm,asmjs\"
# FLAGS += -s BINARYEN_METHOD=\"interpret-asm2wasm,asmjs\"
# FLAGS += -s BINARYEN_TRAP_MODE=\"clamp\"
# FLAGS += -s TOTAL_MEMORY=4194304
# FLAGS += -s ALLOW_MEMORY_GROWTH=1
FLAGS += -s EMBIND_STD_STRING_IS_UTF8=1

FLAGS += -D "IM_ASSERT(EXPR)=((void)(EXPR))"

FLAGS += -D IMGUI_DISABLE_OBSOLETE_FUNCTIONS
FLAGS += -D IMGUI_DISABLE_DEMO_WINDOWS

.PHONY: all clean

all: $(BIND_IMGUI_OUTPUT_JS)

clean:
	rm -rf $(BUILD)/*
	rm -f $(BIND_IMGUI_OUTPUT_JS)

$(BUILD)/%.bc: %.cpp $(IMGUI_SOURCE_HXX)
	mkdir -p $(BUILD)/imgui
	emcc $(FLAGS) -I $(IMGUI_PATH) -c $< -o $@

$(BIND_IMGUI_OUTPUT_BC): bind-imgui.cpp $(IMGUI_SOURCE_HXX)
	emcc $(FLAGS) -I $(IMGUI_PATH) -c --bind $< -o $@

$(BIND_IMGUI_OUTPUT_JS): $(IMGUI_OUTPUT_BC) $(BIND_IMGUI_OUTPUT_BC)
	emcc $(FLAGS) -I $(IMGUI_PATH) --bind $^ -o $@
