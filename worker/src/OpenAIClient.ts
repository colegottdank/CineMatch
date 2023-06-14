import { IMovieRec, MovieRec } from './MovieRec';
import { rec_prompt } from './prompts';
import { RequestWrapper } from './router';

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
    await this.loadChatClient();
    const { HumanChatMessage, SystemChatMessage } = await this.loadLangchainSchema();
    let messages = [
      new SystemChatMessage(rec_prompt),
      new HumanChatMessage(`People to generate 2 movie recommendations for: ${JSON.stringify(combinedJson)}`),
    ];

    let gpt_tokenizer = await import("gpt-tokenizer");
    const tokens = gpt_tokenizer.encode(JSON.stringify(messages));

    //8192
    this.chatClient.maxTokens = 8192 - tokens.length;
    this.chatClient.modelName = "gpt-4";
    this.chatClient.temperature = 0.5;

    let moviesJson = '';
    let response;
    try{
        response = await this.chatClient.call(messages);
    }
    catch(error) {
        throw error;
    }

    try {
      moviesJson = response.text.substring(response.text.indexOf('['), response.text.lastIndexOf(']') + 1);
      let moviesArray = JSON.parse(moviesJson);
      let movies = moviesArray.map((movieJson: IMovieRec) => new MovieRec(movieJson));

      movies.forEach((movie: MovieRec) => {
        movie.validate();
      });
      return movies;
    } catch (error: any) {
      const { HumanChatMessage } = await this.loadLangchainSchema();
      this.chatClient.modelName = 'gpt-3.5-turbo';
      this.chatClient.maxTokens = 4000;
      const fixedResponse = await this.chatClient.call([
        new HumanChatMessage(
          'Please fix and return just the json that may or may not be invalid. Do not return anything that is not JSON.' +
            error.message +
            'JSON to fix: ' +
            moviesJson
        ),
      ]);
      moviesJson = fixedResponse.text.substring(fixedResponse.text.indexOf('['), fixedResponse.text.lastIndexOf(']') + 1);
      let moviesArray = JSON.parse(moviesJson);
      let movies = moviesArray.map((movieJson: IMovieRec) => new MovieRec(movieJson));

      movies.forEach((movie: MovieRec) => {
        movie.validate();
      });

      return movies;
    }
  }
}
