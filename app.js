import 'dotenv/config';
console.log('PUBLIC_KEY:', process.env.PUBLIC_KEY);
import { GoogleGenAI } from "@google/genai";
import express from 'express';
import {
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';
import { getRandomEmoji, DiscordRequest } from './utils.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
  // Interaction id, type and data
  const { id, type, data } = req.body;

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    // "test" command
    if (name === 'checkstatus') {
      // Send a message into the channel where command was triggered from
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              // Fetches a random emoji to send from a helper function
              content: `It's up and running ${getRandomEmoji()}`
            }
          ]
        },
      });
    }
    // Message Context Menu Command
    if (name === 'analyze') {
      console.log(data);
      const targetMessage = data.resolved.messages[data.target_id];
      if (!targetMessage) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: 'No message found' },
        });
      }


      const wordCount =targetMessage.content.split(' ').length;
      const charCount = targetMessage.content.length;
      
      // Calculate character frequency (excluding spaces)
      const charFreq = {};
      for (const char of targetMessage.content) {
        charFreq[char] = (charFreq[char] || 0) + 1;
      }
      // Create a sorted frequency table string formatted as 5x4 grid
      const sortedFreq = Object.entries(charFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20) // Take top 20 for 5x4 grid
        .map(([char, count]) => {
          const displayChar = char === ' ' ? ' ' : 
                             char === '\n' ? '␤' : 
                             char === '\t' ? '␉' : 
                             char === '`' ? '´':
                             char;
          const percentage = (count/charCount*100).toFixed(1);
          return { char: displayChar, count, percentage };
        });

      // Format into 5x4 grid
      let gridRows = [];
      for (let i = 0; i < 5; i++) {
        let row = [];
        for (let j = 0; j < 4; j++) {
          const index = i * 4 + j;
          if (index < sortedFreq.length) {
            const item = sortedFreq[index];
            row.push(`\`'${item.char}': ${item.count} [${item.percentage}%]\``);
          }
        }
        gridRows.push(row.join(' | '));
      }
      
      const gridDisplay = gridRows.join('\n');
      
      console.log(
        `**Message Analysis**
               Words: ${wordCount} 
               Characters: ${charCount}
               Has embeds: ${targetMessage.embeds.length > 0 ? 'yea' : 'NO!!!'}
               Has attachments: ${targetMessage.attachments.length > 0 ? 'yes' : 'NAH'}
               Frequency:
               ${gridDisplay}
              `)
      var feeling = Math.random()>0.5?"yeah this is probably true":"NO NO NO DO NOT TAKE THIS SERIOUSLY I THINK THE PERSON WAS JOKING OKAY?"
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              content: 
              `**Message Analysis**
Words: ${wordCount} 
Characters: ${charCount}
Has embeds: ${targetMessage.embeds.length > 0 ? 'yea' : 'NO!!!'}
Has attachments: ${targetMessage.attachments.length > 0 ? 'yes' : 'NAH'}
Frequency (Top 20):
${gridDisplay}
-# ${feeling}
              `
            }
          ]
        },
      }
    );
    }
    if (name === 'rating'){
      const targetMessage = data.resolved.messages[data.target_id];
      if (!targetMessage) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: 'No message found to rate' },
        });
      }
      console.log(targetMessage.content)
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const prompt = `
  Rate this message based on the following rules:
    a. Grammar: 32 points: 
      1. Rate messages high if the message is grammatically correct and has no spelling errors (a 32/32 would have no errors)
      2. Punctuation is also considered here. 
      3. Sentence variety is not considered here, instead the variety of sentence structures is considered in the seasoning section.
    b. Coherency: 32 points: 
      1. Rate messages high if the message is coherent and makes sense (a 32/32 wouldhave all the sentences relate to one another or relate to a specific thing, slight disruptions allowed)
      2. Don't be too harsh if they are seperated or isolated as long as they are not gibberish (rate them a 10-20/32 at the least) as messages are commonly split.
    c. Emojis: 16 points: 
      1. A 16/16 would be one emoji per ten words. This is th 
      2. Please report the target number of emojis as well. (**NOT THE RATIO**)
      3. The emojis don't have to be related to the message. 
      4. Do NOT include the words {'emoji', 'emojis', 'emote', 'emotion', 'emo'}. If there are 0 emojis, rate it a 0/16.
    d. Seasoning: MAX 20 points:
      1. Only the words {'quixotic', 'infinitesimal', 'hinderance', 'salt', 'pepper'} and their other forms contribute to a portion (about 4 points added per word included, max 16) of the score if included (Clarification: two instances of 'salt' only count as one). 
      2. Special formatting like bolds, italics, and strikethroughs are rewarded if the seasoning words aren't used. (This is valued at 8 points)
      3. Anything (except unique characters or symbols) that stands out about this message (such as something agressive, passive, funny, or overall a strong tone) can be rewarded here. (This is valued at 12 points)
        3-1. direct, indirect, casual, formal tones are not considered here, instead things that are more unique can be considered.
      4. Variety of sentence structures is considered here.
      
    E. EMPTY (no letters) TEXT IS AN AUTOMATIC 0/100 FOR EFFORT REASONS
  Please provide a 40-70 word explanation with your rating and a reasoning for each section. 
  Mold your reasoning and your explanation to these rules:
    0. 100/100s are very much possible! Please don't take points off for no reason.
    1. Use a casual, stright-to-the-point tone. 
    2. Include examples of what made the message good or bad.
    3. Consider asking yourself: How can this message improve to become 100/100? 
      a. Write your answer to this question in ***bold*** with the rest of the explanation.
    4. In your reasoning for each section, explain why you took points off for each section, even if it is close to the maximum. Think of every section starting at the maximum score.
**Format your response strictly like this:**
  Grammar: 14/32
    - Sample Reasoning
  Coherency: 14/32
    - Sample Reasoning
  Emojis: 3/16
    - Sample Reasoning
  Seasoning: 14/20
    - Sample Reasoning
  **Total - 45/100**
  Explanation: Sample text Here


  Message:
      ${targetMessage.content}
      `

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: prompt,
      });

      // Parse JSON and format: emojis+words+language+length=sum; explanation
      const rawText = typeof response.text === 'function' ? response.text() : String(response.text || '');
      let formatted = rawText;
      const description = formatted.length > 4000 ? formatted.slice(0, 3997) + '...' : formatted +'\n';

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [
            {
              title: 'Rating Result',
              description,
              color: 0x5865F2,
            },
          ],
        },
      });
    }
    console.error(`unknown command: ${name}`);
    return res.status(400).json({ error: 'unknown command' });
  }

  console.error('unknown interaction type', type);
  return res.status(400).json({ error: 'unknown interaction type' });
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
