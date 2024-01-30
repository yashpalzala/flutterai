
// Import the necessary modules.
const vscode = require('vscode');

const fetch = require('node-fetch');



// Define the command to be executed.


/**
 * @param {vscode.ExtensionContext} context
 */
 function activate(context){

	let disposableGenCode = vscode.commands.registerCommand("flutterai.generateDartCode", async () => {


		await mainFunc(context);
		
		});
		context.subscriptions.push(disposableGenCode);

		// Enter/Replace key command
		let enterKeyCommand = vscode.commands.registerCommand("flutterai.enterOnlyKey", async () => {


			await setApiKey(context);
			
			});
			context.subscriptions.push(enterKeyCommand);
	}





async function mainFunc(context){
	
	
// get and set the key first
let apiKey =  await getApiKey(context);
if(!apiKey) {
	apiKey = await setApiKey(context);
}

if(!apiKey){
	return vscode.window.showErrorMessage('Terminated: API Key not found');;
}


  // Get the active text editor.
  const editor = vscode.window.activeTextEditor;

  // Get the current contents of the active text editor.
  const text = editor.document.getText();
  const textAppend = 'only code and corresponding comments only if necessary. Don\'t write language name in beginning and remove semi-colon or any ending symbol if present from last as it is a code snippet';
  const userInputPrompt = await vscode.window.showInputBox({
	
	prompt: 'Write a container with rounded corners with radius 8 in flutter',
	value: 'Write a code snippet in flutter ...', // Optional: default value in the input box
  });
  // Prepare the API request body.
  if(!userInputPrompt) return ;
  const body = {
    contents: [
      {
        parts: [
          {
           "text": userInputPrompt+textAppend,
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

  // Send the API request.
  

  // Get the API response body.
  
  const data = await response.json();
  if(response.status != 200){
	vscode.window.showErrorMessage('Something went wrong. REASON: '+data['error']['message']);
	return;
}

const resultText = data.candidates[0].content.parts[0].text;
if(!resultText) {
	vscode.window.showErrorMessage('Something went wrong. REASON: '+data.candidates[0].finishReason);
	return;
}
//   console.log(resultText);

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
	console.log(dartCodeSnippet);
    editor.edit((editBuilder) => {
      editBuilder.insert(editor.selection.start, dartCodeSnippet);
    });
  } else {
    vscode.window.showErrorMessage('No active text editor or selection found.');
  }
}


//Function to set API key

async function setApiKey(context){
	const apiKey = await vscode.window.showInputBox({
		prompt: 'API Key from here [link](https://makersuite.google.com/app/apikey)',
		placeHolder: 'API Key',
		password: true, // Hide the input (optional)
		ignoreFocusOut: true
	  });
	
	  if (apiKey) {
		// let someSetup = await vscode.workspace.getConfiguration().update('flutterai.key', apiKey, true);
		// console.log(someSetup);
		// Store the API key in the global configuration
		// await vscode.workspace.getConfiguration().update('flutterai.key', apiKey, vscode.ConfigurationTarget.Global);
		await context.secrets.store('flutterai.key', apiKey);
	
		vscode.window.showInformationMessage('API key saved successfully!');
		
// let sec = await vscode.;
		// console.log(sec);
		


		return apiKey;
	  }
}

async function getApiKey(context){
	
	
	// Retrieve API key
const apiKey = await context.secrets.get('flutterai.key');
	
    if (apiKey) {
      return apiKey;
    } else {
      return;
    }
}

// Function to validate the generated code.
function validateDartCode(code) {
  //TODO: write a code to validate dart code
}

// Function to convert the generated code to a Dart code snippet.
function toDartCodeSnippet(code) {
  // Wrap the generated code in a Dart code snippet.
  return code.replace(/```/g, '');
}

// This method is called when your extension is deactivated
function deactivate() {}


module.exports = {
	activate,
	deactivate
}

