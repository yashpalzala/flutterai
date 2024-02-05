import * as vscode from 'vscode';
import fetch from 'node-fetch';

let userPastPromptInputs: string[];
const maxStoredInputs = 5;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context: vscode.ExtensionContext) {
    let disposableGenCode = vscode.commands.registerCommand("flutterai.generateDartCode", async () => {
        await generateDartCode(context);
    });
    context.subscriptions.push(disposableGenCode);

    // Enter/Replace key command
    let enterKeyCommand = vscode.commands.registerCommand("flutterai.enterOnlyKey", async () => {
        await setApiKey(context);
    });
    context.subscriptions.push(enterKeyCommand);
}

async function generateDartCode(context: vscode.ExtensionContext) {
    // get and set the key first
    let apiKey = await getApiKey(context);
    if (!apiKey) {
        apiKey = await setApiKey(context);
    }

    if(!userPastPromptInputs)
    userPastPromptInputs = await getUserInputs();

    if (!apiKey) {
        return vscode.window.showErrorMessage('Terminated: API Key not found');
    }

    // Get the active text editor.
    const editor = vscode.window.activeTextEditor!;

    // Get the current contents of the active text editor.
    const text = editor.document.getText();
    const textAppend = 'only code and corresponding comments only if necessary. Don\'t write language name in the beginning and remove semi-colon or any ending symbol if present from last as it is a code snippet';
    
   // added showquickpick before input box for showing past input and let user select it if need be
    let selectedPastInput: string| undefined;
    if(userPastPromptInputs.length >0){
        selectedPastInput = await vscode.window.showQuickPick([...userPastPromptInputs, 'Write a code snippet in flutter ...'], {
            placeHolder: 'Select a previous input or write a new one by selecting last option(Write a code snippet in flutter ...)',
        });
        if(!selectedPastInput)return;
    }

    const userInputPrompt = await vscode.window.showInputBox(
        selectedPastInput != null ? {
        
        value: selectedPastInput, 
    }  : {
            prompt: 'Write a container with rounded corners with radius 8 in flutter',
            value: 'Write a code snippet in flutter ...', // Optional: default value in the input box
        }
        );

    // Prepare the API request body.
    if (!userInputPrompt) return;

    // after all the check add user prompt into the array and storage as well
    addToCacheAndStoreLocally(userInputPrompt);
    const body = {
        contents: [
            {
                parts: [
                    {
                        "text": userInputPrompt + textAppend,
                    },
                ],
            },
        ],
    };

    // Prepare the API request headers.
    const headers = {
        'Content-Type': 'application/json',
    };

    let isCancelled = false;
    let response;

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'Generating code...',
            cancellable: true,
        },
        async (progress, token) => {
            token.onCancellationRequested(() => {
                // Handle cancellation (if needed)
                isCancelled = true;
                vscode.window.showInformationMessage('Task cancelled');
            });

            response = await fetch(
                'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' +
                apiKey,
                {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(body),
                }
            );

            // Optional: Report progress (if needed)
            //   progress.report({ increment: 100 });

            // Perform your long-running task here
        }
    );

    // Get the API response body.
    const data = await response!.json() ;
    if (response!.status != 200) {
        vscode.window.showErrorMessage('Something went wrong. REASON: ' + data['error']['message']);
        return;
    }

    const resultText = data.candidates[0].content.parts[0].text;
    if (!resultText) {
        vscode.window.showErrorMessage('Something went wrong. REASON: ' + data.candidates[0].finishReason);
        return;
    }

    // Get the generated code from the API response body.
    const generatedCode = resultText;

    // Validate the generated code.
    //   const isValidDartCode = validateDartCode(generatedCode);

    // If the generated code is valid, convert it to a Dart code snippet.
    //   const dartCodeSnippet = isValidDartCode ? toDartCodeSnippet(generatedCode) : '';
    const dartCodeSnippet = toDartCodeSnippet(generatedCode);

    // Insert the generated code snippet into the active text editor.
    if (editor && editor.selection && !isCancelled) {
        // Insert the generated code snippet into the active text editor.
        // console.log(dartCodeSnippet);
        editor.edit((editBuilder) => {
            editBuilder.insert(editor.selection.start, dartCodeSnippet);
        });
    } else {
        vscode.window.showErrorMessage('No active text editor or selection found.');
    }
}

// Function to set API key
async function setApiKey(context: vscode.ExtensionContext) {
    const apiKey = await vscode.window.showInputBox({
        prompt: 'API Key from here [link](https://makersuite.google.com/app/apikey)',
        placeHolder: 'API Key',
        password: true, // Hide the input (optional)
        ignoreFocusOut: true,
    });

    if (apiKey) {
        await context.secrets.store('flutterai.key', apiKey);
        vscode.window.showInformationMessage('API key saved successfully!');
        return apiKey;
    }
}

// Function to get API key from secrets
async function getApiKey(context: vscode.ExtensionContext) {
    const apiKey = await context.secrets.get('flutterai.key');
    return apiKey || undefined;
}

// Function to convert the generated code to a Dart code snippet.
function toDartCodeSnippet(code: string) {
    // Wrap the generated code in a Dart code snippet.
    return code.replace(/```/g, '');
}

// This method is called when your extension is deactivated
function deactivate() {}

const storedInputsKey = 'storedInputs';

async function addToCacheAndStoreLocally(input: string){
    userPastPromptInputs.unshift(input);

if(userPastPromptInputs.length > maxStoredInputs){
    userPastPromptInputs.pop();
}
storeUserInput(userPastPromptInputs);
}

async function storeUserInput(userInputPrompts: string[]) {
    // Update the stored inputs in the configuration
    vscode.workspace.getConfiguration().update(storedInputsKey, userInputPrompts, vscode.ConfigurationTarget.Global);
}

async function getUserInputs(): Promise<string[]> {
    const storedInputs: string[] = vscode.workspace.getConfiguration().get(storedInputsKey, []);
    return storedInputs;
}

export {
    activate,
    deactivate
};
