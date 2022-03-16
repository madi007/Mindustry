const iconsUtil = require("extended-ui/utils/icons");

let isBuilded = false;
let contentTable;
let setCategoryNameDialog;

let currentCategory = 0;
let lastCategory = 0;

let schematicButtonSize;
let categoryButtonSize;

let rows;
let columns;

let oldRows;
let oldColumns;
let oldSize;

//for mobile version
let lastTaped;
let lastTapTime;

Events.on(ClientLoadEvent, () => {

    setCategoryNameDialog = new BaseDialog("New category name");
    setCategoryNameDialog.addCloseButton();
    setCategoryNameDialog.cont.pane(table => {
        table.field(null, text => {
            if (!text) return;

            Core.settings.put("category" + currentCategory + "name", text);
            rebuildTable();
        }).growX();
    }).size(320, 320);
});

Events.run(Trigger.update, () => {
    if (!Core.settings.getBool("eui-ShowSchematicsTable", true)) {
        if (isBuilded) {
            clearTable();
        }
        return;
    }

    rows = Core.settings.getInt("eui-SchematicsTableRows", 4);
    columns = Core.settings.getInt("eui-SchematicsTableColumns", 5);
    schematicButtonSize = Core.settings.getInt("eui-SchematicsTableButtonSize", 30);
    categoryButtonSize = schematicButtonSize + 2;

    if (!contentTable) {
        setMarker();
    }

    if (isRebuildNeeded()) {
        rebuildTable();
    }
});

function showEditSchematicButtonDialog(currentCategory, column, row) {
    let editSchematicButtonDialog = new BaseDialog("Select action");
    editSchematicButtonDialog.addCloseButton();
    editSchematicButtonDialog.cont.pane(table => {
        table.button("Set schematic", Styles.defaultt, () => {
            showEditSchematicDialog(currentCategory, column, row);
            editSchematicButtonDialog.hide();
        }).width(240).height(50);
        table.row();
        table.button("Set image", Styles.defaultt, () => {
            showEditImageDialog(getSchematicString(currentCategory, column, row) + "image");
            editSchematicButtonDialog.hide();
        }).padTop(10).width(240).height(50);
    });

    editSchematicButtonDialog.show();
}

function showEditImageDialog(name) {
    let size = Vars.mobile ? 320 : 640

    const editImageDialog = new BaseDialog("Select image");
    editImageDialog.addCloseButton();   

    let iconsAndSprites = [iconsUtil.getIcons(), iconsUtil.getSprites()];
    for (let images of iconsAndSprites) {
        let r = 0;
        editImageDialog.cont.pane(table => {
            for (let image of Object.entries(images)) {
                const setted_name = image[0];
                let imageButton = table.button(image[1], Styles.cleari, () => {
                    Vars.ui.announce("setted as " + setted_name);
                    Core.settings.put(name, setted_name);
                    
                    rebuildTable();
                }).size(48).pad(4).get();
                imageButton.resizeImage(48*0.8);
        
                if (++r % 8 == 0) table.row();
            }
        }).size(size, size);
    }

    editImageDialog.show();
}

function showEditSchematicDialog(currentCategory, column, row) {
    let setSchematicDialog = new BaseDialog("Insert schematic name");
    setSchematicDialog.addCloseButton();
    setSchematicDialog.cont.pane(table => {
        table.labelWrap("Insert schematic name").growX();
        table.row();
        table.field(Core.settings.getString(getSchematicString(currentCategory, column, row), ""), text => {
            Core.settings.put(getSchematicString(currentCategory, column, row), text);
            rebuildTable();
        }).growX();
    }).size(Core.graphics.getWidth()/2, 640);
    setSchematicDialog.show();
}

function setMarker() {
    let overlayMarker = Vars.ui.hudGroup.find("minimap/position");
    overlayMarker.row();
    contentTable = overlayMarker.table(Styles.black3).top().right().get();
    contentTable.visibility = () => isBuilded;
}

function isRebuildNeeded() {
    if (!isBuilded) return true;

    if (!oldColumns || !oldRows || !oldSize) {
        oldRows = rows;
        oldColumns = columns;
        oldSize = schematicButtonSize;
    }
    if (rows != oldRows || columns != oldColumns || oldSize != schematicButtonSize) {
        oldRows = rows;
        oldColumns = columns;
        oldSize = schematicButtonSize;
        return true;
    }

    if (lastCategory != currentCategory) {
        lastCategory = currentCategory;
        return true;
    }

    return false;
}

function rebuildTable() {
    clearTable();
    buildTable();
}

function buildTable() {
    const wrapped = contentTable.table().margin(3).get();
    let imageButton;

    const categoryButtonsTable = wrapped.table().get();
    for (let i = 0; i < columns; i++) {
        const index = i;
        imageButton = categoryButtonsTable.button(getCategoryImage(index), Styles.clearToggleTransi, run(()=>{
            currentCategory = index;
        })).update(b => {
            b.setChecked(currentCategory == index);
        }).width(categoryButtonSize).height(categoryButtonSize).tooltip(getCategoryTooltip(index)).get();
        imageButton.resizeImage(categoryButtonSize*0.8);
        if (!Vars.mobile) {
            imageButton.clicked(Packages.arc.input.KeyCode.mouseRight, run(() => showEditImageDialog("category" + index + "image")));
        } else {
            imageButton.clicked(run(() => {
                if (mobileDoubleTap("category" + index + "image")) {
                    showEditImageDialog("category" + index + "image");
                    // Clicks on label from the phone impossible? so this is here
                    setCategoryNameDialog.show();
                }
            }));
        }
    }

    wrapped.row();
    let categoryLabel = wrapped.labelWrap(getCategoryLabelText()).width(categoryButtonSize*columns).padTop(6).padBottom(6).get();
    categoryLabel.setAlignment(Align.center);
    if (!Vars.mobile) {
        categoryLabel.clicked(Packages.arc.input.KeyCode.mouseRight, run(() => setCategoryNameDialog.show()));
    }

    wrapped.row();
    const schematicButtonsTable = wrapped.table().get();
    for (let i = 0; i < rows; i++) {
        const row = i;
        for (let j = 0; j < columns; j++) {
            const column = j;
            const schematic = findSchematic(currentCategory, column, row);

            imageButton = schematicButtonsTable.button(getSchematicImage(column, row), Styles.defaulti, run(()=>{
                if (schematic) Vars.control.input.useSchematic(schematic);
            })).update(b => {
                b.setDisabled(false);
            }).width(schematicButtonSize).height(schematicButtonSize).pad(1).tooltip(getSchematicTooltip(schematic)).get();
            imageButton.resizeImage(schematicButtonSize*0.6);
            if (!Vars.mobile) {
                imageButton.clicked(Packages.arc.input.KeyCode.mouseRight, run(() => showEditSchematicButtonDialog(currentCategory, column, row)));
            } else {
                imageButton.clicked(run(() => {
                    if (mobileDoubleTap(getSchematicString(currentCategory, column, row))) {
                        showEditSchematicButtonDialog(currentCategory, column, row)
                    }
                }));
            }
        }
        schematicButtonsTable.row();
    }

    isBuilded = true;
}

function clearTable() {
    if (!isBuilded) return;

    contentTable.clearChildren();
    isBuilded = false;
}

function getCategoryTooltip(categoryId) {
    return Core.settings.getString("category" + categoryId + "name", "Category name not set yet");
}

function getCategoryLabelText() {
    let defaultText;

    if (Vars.mobile) {
        defaultText = "Double tap on pencil to set name AND image"
    } else {
        defaultText = "Right click to set"
    }

    return Core.settings.getString("category" + currentCategory + "name", defaultText);
}

function getCategoryImage(categoryId) {
    return iconsUtil.getByName(Core.settings.getString("category" + categoryId + "image"));
}

function getSchematicImage(column, row) {
    return iconsUtil.getByName(Core.settings.getString(getSchematicString(currentCategory, column, row) + "image"));
}

function getSchematicString(category, column, row) {
    return "schematic" + category + "." + column + "." + row;
}

function getSchematicTooltip(schematic) {
    if (schematic) {
        return "Use " + schematic.name();
    } else {
        return "Right click to set";
    }
}

function findSchematic(category, column, row) {
    let name = Core.settings.getString(getSchematicString(category, column, row));
    let schem = null;
	Vars.schematics.all().each((s) => {
		if(s.name() == name) {
			schem = s;
		}
	});
    return schem;
}

function mobileDoubleTap(name) {
    if (lastTaped == name && Date.now() - lastTapTime < 250) {
        return true;
    } else {
        lastTaped = name;
        lastTapTime = Date.now();
        return false;
    }
}
