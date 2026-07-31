require.config({
    paths: {
        vs: "https://unpkg.com/monaco-editor@0.52.2/min/vs"
    }
});

function updateTitle() {
    if (!currentFile)
        return;
    document.title =
        (currentFile.modified ? "* " : "") + currentFile.name;
}

let editor;

const files = [];
let currentFile = null;

require(["vs/editor/editor.main"], function () {
    monaco.languages.register({
        id: "pseudocode"
    });
    monaco.languages.setMonarchTokensProvider("pseudocode", {
        keywords: ["OF", "AND", "APPEND", "ARRAY", "BOOLEAN", "BYREF", "BYVAL", "CALL", "CASE", "CHAR", "CLASS", "CLOSEFILE", "CONSTANT", "DATE", "DECLARE", "DIV", "ELSE", "ENDCASE", "ENDCLASS", "ENDFUNCTION", "ENDIF", "ENDPROCEDURE", "ENDTYPE", "ENDWHILE", "EOF", "FALSE", "FOR", "TO", "FUNCTION", "GETRECORD", "IF", "INHERITS", "INPUT", "INT", "INTEGER", "LCASE", "LENGTH", "MID", "MOD", "NEXT", "NEW", "NOT", "OPENFILE", "OR", "OTHERWISE", "OUTPUT", "PROCEDURE", "PRIVATE", "PUBLIC", "PUTRECORD", "RAND", "RANDOM", "READ", "READFILE", "REAL", "REPEAT", "RETURN", "RETURNS", "RIGHT", "SEEK", "STEP", "STRING", "SUPER", "THEN", "TRUE", "TYPE", "UCASE", "UNTIL", "WHILE", "WRITE", "WRITEFILE"],
        tokenizer: {
            root: [
                [/\/\/.*/, "comment"],
                [/"([^"\\]|\\.)*"/, "string"],
                [/'[^']'/, "string"],
                [/\d+\.\d+/, "number.float"],
                [/\d+/, "number"],
                [/[A-Za-z_][A-Za-z0-9_]*/, {
                    cases: {
                        "@keywords": "keyword"
                    }
                }],
                [/<-|<=|>=|<>|=|<|>|\+|-|\*|\/|&/, "operator"]
            ]
        }
    });
    monaco.editor.defineTheme("pseudocode-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [
            { token: "keyword", foreground: "c678dd" },
            { token: "comment", foreground: "ff5733" },
            { token: "string", foreground: "98c379" },
            { token: "number", foreground: "d19a66" },
            { token: "number.float", foreground: "d19a66" }
        ],
        colors: {}
    });
    monaco.languages.registerCompletionItemProvider("pseudocode", {
        provideCompletionItems: function(model, position) {
            const keywords = ["OF", "AND", "APPEND", "ARRAY", "BOOLEAN", "BYREF", "BYVAL", "CALL", "CASE", "CHAR", "CLASS", "CLOSEFILE", "CONSTANT", "DATE", "DECLARE", "DIV", "ELSE", "ENDCASE", "ENDCLASS", "ENDFUNCTION", "ENDIF", "ENDPROCEDURE", "ENDTYPE", "ENDWHILE", "EOF", "FALSE", "FOR", "TO", "FUNCTION", "GETRECORD", "IF", "INHERITS", "INPUT", "INT", "INTEGER", "LCASE", "LENGTH", "MID", "MOD", "NEXT", "NEW", "NOT", "OPENFILE", "OR", "OTHERWISE", "OUTPUT", "PROCEDURE", "PRIVATE", "PUBLIC", "PUTRECORD", "RAND", "RANDOM", "READ", "READFILE", "REAL", "REPEAT", "RETURN", "RETURNS", "RIGHT", "SEEK", "STEP", "STRING", "SUPER", "THEN", "TRUE", "TYPE", "UCASE", "UNTIL", "WHILE", "WRITE", "WRITEFILE"]
            const suggestions = keywords.map(word => ({
                label: word,
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: word
            }));
            return {
                suggestions: suggestions
            };
        }
    });
    editor = monaco.editor.create(document.getElementById("editor"), {
        value: "",
        language: "pseudocode",
        theme: "pseudocode-dark",
        automaticLayout: true,
        fontFamily: "Consolas",
        fontSize: 15,
        minimap: {
            enabled: true
        },
        quickSuggestions: true,
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnEnter: "on",
        tabCompletion: "on",
        wordBasedSuggestions: "off"
    });

    editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
        () => saveFile()
    );

    editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS,
        () => saveFileAs()
    );

    editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN,
        () => newPseudoFile()
    );

    editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyO,
        () => document.getElementById("file-input").click()
    );

    editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF,
        () => editor.getAction("actions.find").run()
    );

    editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ,
        () => editor.trigger("keyboard", "undo")
    );

    editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyY,
        () => editor.trigger("keyboard", "redo")
    );

    editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ,
        () => editor.trigger("keyboard", "redo")
    );

    editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC,
        () => document.getElementById("copy-button").click()
    );

    editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX,
        () => document.getElementById("cut-button").click()
    );

    editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV,
        () => document.getElementById("paste-button").click()
    );

    editor.addCommand(
        monaco.KeyCode.F5,
        () => runProgram()
    );

    createFile("program.pseudo", "pseudo");
    editor.onDidChangeModelContent(() => {
        if (!currentFile)
            return;
        currentFile.modified = true;
        refreshTab(currentFile);
        updateTitle();
    });
    editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
        () => {
            saveFile();
        }
    );
    document.getElementById("run-button")
        .addEventListener("click", runProgram);
    monaco.editor.setTheme("pseudocode-dark");
});

async function runProgram() {
    if (!currentFile)
        return;
    if (currentFile.type !== "pseudo") {
        alert("Only pseudocode files can be run.");
        return;
    }
    document.getElementById("terminal-output").textContent = "";
    try {
        const response = await fetch("/run", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                code: currentFile.model.getValue()
            })
        });
        if (!response.ok)
            throw new Error("Server error");
        const result = await response.json();
        if (!result.success) {
            document.getElementById("terminal-output").textContent =
                result.message + "\n";
        }
    }
    catch (err) {
        document.getElementById("terminal-output").textContent =
            "Failed to run program.\n";
    }
}

const terminalInput = document.getElementById("terminal-input");
terminalInput.addEventListener("keydown", async function(e) {
    if (e.key !== "Enter")
        return;

    const value = terminalInput.value;

    // Echo the input to the terminal
    const terminal = document.getElementById("terminal-output");

    const line = document.createElement("div");
    line.textContent = "> " + value;
    terminal.appendChild(line);

    terminalInput.value = "";

    await fetch("/input", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            input: value
        })
    });
});

async function updateInputState() {
    const response = await fetch("/waiting");
    const result = await response.json();
    const input = document.getElementById("terminal-input");
    const inputLine = document.getElementById("terminal-input-line");
    inputLine.style.display = result.waiting ? "flex" : "none";
    input.disabled = !result.waiting;
    if (result.waiting)
        input.focus();
}

async function updateTerminal() {
    const response = await fetch("/output");
    const outputs = await response.json();
    if (outputs.length === 0)
        return;
    const terminal = document.getElementById("terminal-output");
    const shouldScroll =
        terminal.scrollTop + terminal.clientHeight >= terminal.scrollHeight - 20;
    for (const item of outputs) {
        const line = document.createElement("div");
        line.textContent = item.text;
        if (item.type === "error")
            line.style.color = "#ff5555";
        else
            line.style.color = "#ffffff";
        terminal.appendChild(line);
    }
    if (shouldScroll)
        terminal.scrollTop = terminal.scrollHeight;
}

document.getElementById("save-button").addEventListener("click", saveFile);
async function saveFile() {
    if (!currentFile.saved) {
        let filename = prompt(
            "Enter filename:",
            currentFile.name
        );
        if (!filename)
            return;
        if (!filename.includes(".")) {
            filename += currentFile.type === "pseudo"
                ? ".pseudo"
                : ".txt";
        }
        currentFile.name = filename;
        currentFile.saved = true;
        refreshTab(currentFile);
        updateTitle();
    }
    const response = await fetch("/save", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            filename: currentFile.name,
            code: currentFile.model.getValue()
        })
    });
    const result = await response.json();
    if (result.success) {
        currentFile.modified = false;
        refreshTab(currentFile);
        updateTitle();
    }
}

document.getElementById("load-button")
    .addEventListener("click", () => {
        document.getElementById("file-input").click();
    });

document.getElementById("file-input")
    .addEventListener("change", openFile);

function openFile(event) {
    const file = event.target.files[0];
    if (!file)
        return;
    if (
        !file.name.endsWith(".pseudo") &&
        !file.name.endsWith(".txt")
    ) {
        alert("Please select a .pseudo or .txt file.");
        event.target.value = "";
        return;
    }
    const existing = files.find(f => f.name === file.name);
    if (existing) {
        switchToFile(existing);
        event.target.value = "";
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        const type =
            file.name.endsWith(".txt")
                ? "text"
                : "pseudo";

        const language =
            type === "text"
                ? "plaintext"
                : "pseudocode";

        const fileObj = {
            name: file.name,
            type: type,
            saved: true,
            modified: false,
            model: monaco.editor.createModel(
                e.target.result,
                language
            )
        };
        files.push(fileObj);
        addTab(fileObj);
        switchToFile(fileObj);
    };
    reader.readAsText(file);
    event.target.value = "";
}

function createFile(name, type) {
    const language =
        type === "pseudo"
            ? "pseudocode"
            : "plaintext";
    const file = {
        name: name,
        type: type,
        saved: false,
        modified: false,
        model: monaco.editor.createModel("", language)
    };
    files.push(file);
    addTab(file);
    switchToFile(file);
}

function newPseudoFile() {
    createFile(
        "untitled" + (files.length + 1) + ".pseudo",
        "pseudo"
    );
}

function newTextFile() {
    createFile(
        "untitled" + (files.length + 1) + ".txt",
        "text"
    );
}

function saveFileAs() {
    if (!currentFile)
        return;
    let filename = prompt(
        "Enter filename:",
        currentFile.name
    );
    if (!filename)
        return;
    if (!filename.includes(".")) {
        filename += currentFile.type === "pseudo"
            ? ".pseudo"
            : ".txt";
    }
    const blob = new Blob(
        [currentFile.model.getValue()],
        { type: "text/plain" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function switchToFile(file) {
    currentFile = file;
    editor.setModel(file.model);
    for (const f of files)
        f.tab.classList.remove("active");
    file.tab.classList.add("active");
    updateTitle();
}

function addTab(file) {
    const tab = document.createElement("div");
    tab.className = "tab";
    const name = document.createElement("span");
    name.className = "tab-name";
    name.textContent = file.name;
    const close = document.createElement("button");
    close.className = "close-tab";
    close.textContent = "×";
    tab.appendChild(name);
    tab.appendChild(close);
    tab.onclick = () => switchToFile(file);
    close.onclick = e => {
        e.stopPropagation();
        closeFile(file);
    };
    document.getElementById("tab-bar")
        .insertBefore(tab, document.getElementById("new-tab-button"));
    file.tab = tab;
    file.nameElement = name;
}

function refreshTab(file) {
    file.nameElement.textContent =
        (file.modified ? "* " : "") + file.name;
}

function closeFile(file) {
    if (file.modified) {
        if (!confirm(`Discard changes to ${file.name}?`))
            return;
    }
    file.model.dispose();
    file.tab.remove();
    const index = files.indexOf(file);
    files.splice(index, 1);
    if (files.length === 0) {
        newPseudoFile();
        return;
    }
    const next =
        files[index] || files[index - 1];
    switchToFile(next);
}

document.getElementById("new-pseudo-button").onclick = newPseudoFile;
document.getElementById("new-text-button").onclick = newTextFile;

document.getElementById("save-as-button").onclick = saveFileAs;

document.getElementById("undo-button").onclick = () =>
    editor.trigger("menu", "undo");

document.getElementById("redo-button").onclick = () =>
    editor.trigger("menu", "redo");

document.getElementById("copy-button").onclick = async () => {
    const text = editor.getModel().getValueInRange(editor.getSelection());
    await navigator.clipboard.writeText(text);
};

document.getElementById("cut-button").onclick = async () => {
    const selection = editor.getSelection();
    const text = editor.getModel().getValueInRange(selection);
    await navigator.clipboard.writeText(text);
    editor.executeEdits("", [{
        range: selection,
        text: ""
    }]);
    editor.focus();
};

document.getElementById("paste-button").onclick = async () => {
    const text = await navigator.clipboard.readText();
    editor.executeEdits("", [{
        range: editor.getSelection(),
        text: text
    }]);
    editor.focus();
};

document.getElementById("find-button").onclick = () =>
    editor.getAction("actions.find").run();

document.getElementById("about-button").onclick = () =>
    alert("pseudocode interpreter\nversion 1.0");

document.getElementById("new-tab-button").onclick = newPseudoFile;

setInterval(updateInputState, 100);
setInterval(updateTerminal, 100);

window.addEventListener("beforeunload", e => {
    if (!files.some(file => file.modified))
        return;
    e.preventDefault();
    e.returnValue = "";
});