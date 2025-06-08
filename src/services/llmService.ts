import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Только для разработки, в продакшене нужно использовать бэкенд
});

interface ColumnSuggestion {
  field: string;
  headerName: string;
  type: 'text' | 'number' | 'select';
  description: string;
  options?: string[];
}

export const analyzeInstructions = async (instructions: string): Promise<ColumnSuggestion[]> => {
  try {
    const prompt = `
      Analyze the following instructions for a student report and suggest appropriate columns for a data table.
      The columns should help teachers track and evaluate student progress.
      
      Instructions:
      ${instructions}
      
      Please provide a list of columns in the following format:
      - field: unique identifier for the column
      - headerName: display name in Russian
      - type: one of 'text', 'number', or 'select'
      - description: brief explanation of what this column measures
      - options: (optional) array of possible values for select type columns
      
      Focus on practical, measurable aspects that teachers can easily track.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that analyzes educational requirements and suggests appropriate data columns for tracking student progress."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    // Парсим ответ от LLM в структурированный формат
    const suggestions = JSON.parse(response.choices[0].message.content);
    return suggestions;
  } catch (error) {
    console.error('Error analyzing instructions:', error);
    throw new Error('Failed to analyze instructions');
  }
};

export const generateColumnOptions = async (column: ColumnSuggestion): Promise<string[]> => {
  if (column.type !== 'select') return [];

  try {
    const prompt = `
      Generate appropriate options for a select column in a student report.
      Column: ${column.headerName}
      Description: ${column.description}
      
      Please provide a list of 3-5 options that make sense for this column.
      The options should be in Russian and be mutually exclusive.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates appropriate options for educational assessment columns."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    // Парсим ответ от LLM в массив опций
    const options = JSON.parse(response.choices[0].message.content);
    return options;
  } catch (error) {
    console.error('Error generating column options:', error);
    return [];
  }
}; 