import { IMovieRec, MovieRec } from './MovieRec';
import { rec_prompt, rec_prompt2, rec_prompt_improve } from './prompts';
import { RequestWrapper } from './router';
export const gpt4 = 'gpt-4';
export const gpt4MaxTokens = 8192;
export const gpt35 = 'gpt-3.5-turbo';
export const gpt35MaxTokens = 4096;
export const gpt3516k = 'gpt-3.5-turbo-16k';
export const gpt3516kMaxTokens = 16384;

export class OpenAIClient {
  private chatClient: any;
  private langchain: any;

  constructor(private request: RequestWrapper) {}

  private async loadChatClient() {
    if (!this.chatClient) {
      await import('langchain/chat_models/openai').then(({ ChatOpenAI }) => {
        this.chatClient = new ChatOpenAI(
          {
            openAIApiKey: this.request.env.OPENAI_API_KEY,
          },
          {
            basePath: 'https://oai.hconeai.com/v1',
            baseOptions: {
              headers: {
                'Helicone-Auth': `Bearer ${this.request.env.HELICONE_API_KEY}`,
              },
            },
          }
        );
      });
    }

    return this.chatClient;
  }

  private async loadLangchainSchema() {
    if (!this.langchain) {
      this.langchain = await import('langchain/schema');
    }
    return this.langchain;
  }

  public async createMovieRecommendation(combinedJson: any): Promise<MovieRec[]> {
    const initialSettings: ChatClientSettings = {
      modelName: 'gpt-4',
      temperature: 1,
    };

    const chatClient = await this.loadChatClient();

    const langchainSchema = await this.loadLangchainSchema();
    const initialMessages = [
      new langchainSchema.SystemChatMessage(rec_prompt2),
      new langchainSchema.HumanChatMessage(`People to generate 2 movie recommendations for: ${JSON.stringify(combinedJson)}`),
    ];

    let movies = await this.getMovieRecommendations(chatClient, initialMessages, initialSettings);
    
    const improvementSettings: ChatClientSettings = {
      modelName: 'gpt-4',
      temperature: 1,
    };

    const improvementMessages = [
      new langchainSchema.SystemChatMessage(rec_prompt_improve),
      new langchainSchema.HumanChatMessage(
        `Here are the people we are recommending movies for: ${JSON.stringify(
          combinedJson
        )}. Here is the previous recommendation: ${JSON.stringify(movies)}`
      ),
    ];

    return await this.getMovieRecommendations(chatClient, improvementMessages, improvementSettings);
  }

  private async getMovieRecommendations(chatClient: any, messages: any[], settings: ChatClientSettings): Promise<MovieRec[]> {
    await this.applyChatClientSettings(chatClient, settings, messages);

    let moviesJson = '';
    try {
      const response = await chatClient.call(messages);
      moviesJson = this.extractJsonFromResponse(response.text);
    } catch (error) {
      moviesJson = await this.fixAndParseJson(chatClient, error, moviesJson);
    }

    const moviesArray = JSON.parse(moviesJson);
    return moviesArray.map((movieJson: IMovieRec) => {
      const movie = new MovieRec(movieJson);
      movie.validate();
      return movie;
    });
  }

  private async applyChatClientSettings(chatClient: any, settings: ChatClientSettings, messages: any[]) {
    chatClient.modelName = settings.modelName;
    chatClient.temperature = settings.temperature;
    chatClient.maxTokens = await this.calculateMaxTokens(settings, messages);
  }

  private async calculateMaxTokens(settings: ChatClientSettings, messages: any[]): Promise<number> {
    const gpt_tokenizer = await import('gpt-tokenizer');
    const encodedMessageLength = gpt_tokenizer.encode(JSON.stringify(messages)).length;
    let modelMaxTokens: number;

    switch (settings.modelName) {
      case gpt4:
        modelMaxTokens = gpt4MaxTokens;
        break;
      case gpt35:
        modelMaxTokens = gpt35MaxTokens;
        break;
      case gpt3516k:
        modelMaxTokens = gpt3516kMaxTokens;
        break;
      default:
        throw new Error(`Unknown model name: ${settings.modelName}`);
    }

    settings.maxTokens = modelMaxTokens - encodedMessageLength;
    return settings.maxTokens;
  }

  private extractJsonFromResponse(responseText: string): string {
    return responseText.substring(responseText.indexOf('['), responseText.lastIndexOf(']') + 1);
  }

  private async fixAndParseJson(chatClient: any, error: any, json: string): Promise<string> {
    const fixedSettings: ChatClientSettings = {
      modelName: 'gpt-3.5-turbo',
      temperature: 1,
    };

    const langchainSchema = await this.loadLangchainSchema();
    const fixedMessage = new langchainSchema.HumanChatMessage(
      'Please fix and return just the json that may or may not be invalid. Do not return anything that is not JSON.' +
        error.message +
        'JSON to fix: ' +
        json
    );

    this.applyChatClientSettings(chatClient, fixedSettings, [fixedMessage]);

    const fixedResponse = await chatClient.call([fixedMessage]);
    return this.extractJsonFromResponse(fixedResponse.text);
  }
}

interface ChatClientSettings {
  modelName: string;
  temperature: number;
  maxTokens?: number; // This is optional, as it will be set in calculateMaxTokens
}
