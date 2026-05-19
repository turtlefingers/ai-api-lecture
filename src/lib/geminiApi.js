import { TOOLS_DECLARATIONS } from './tools';

export const buildGeminiPayload = (messages, systemInstruction, settings, enabledTools) => {
  const contents = messages.map(msg => ({
    role: msg.role === 'ai' ? 'model' : msg.role,
    parts: msg.parts ? msg.parts : [{ text: msg.text }]
  }));

  const payload = {
    contents
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      role: "user",
      parts: [{ text: systemInstruction }]
    };
  }

  const toolsList = [];
  
  // Add Function Declarations
  const activeFunctions = Object.keys(enabledTools).filter(k => enabledTools[k]);
  if (settings.functionCalling && activeFunctions.length > 0) {
    toolsList.push({
      functionDeclarations: activeFunctions.map(k => ({
        name: TOOLS_DECLARATIONS[k].name,
        description: TOOLS_DECLARATIONS[k].description,
        parameters: TOOLS_DECLARATIONS[k].parameters
      }))
    });
  }

  const currentModel = settings.model || '';

  // Add Google Search Grounding
  if (settings.googleSearch && currentModel !== 'gemini-3.1-flash-lite') {
    toolsList.push({
      googleSearch: {}
    });
  }

  // Add Google Maps Grounding
  if (settings.googleMaps) {
    toolsList.push({
      googleMaps: {}
    });
  }
  
  // Code Execution
  if (settings.codeExecution) {
    toolsList.push({
      codeExecution: {}
    });
  }

  if (toolsList.length > 0) {
    payload.tools = toolsList;
  }

  // Generation Config (e.g. structured outputs - simplified)
  if (settings.structuredOutputs) {
    payload.generationConfig = {
      responseMimeType: "application/json"
    };
  }

  return payload;
};

export const callGeminiApi = async (apiKey, model, payload) => {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorData.error?.message || ''}`);
  }

  return await response.json();
};
