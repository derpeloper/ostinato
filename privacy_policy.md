# privacy policy

this privacy policy explains how i handle, use, and protect your information when you use the ostinato bot.

## data collection and use

ostinato processes voice synthesis requests on my host machine. text from messages is cleaned, filtered, and used to generate audio in real time. the text and generated audio are not intentionally saved to disk or sent to a third-party text-to-speech service.

the bot does store a small amount of information locally so that its settings work properly. this can include discord user, server, and channel ids; voice, speed, and language preferences; custom names; message and name filters; restrictions; channel settings; and temporary rate-limit timestamps. these values are stored in a local, file-based sqlite database on the official host.

discord will still process information under its own terms and privacy policy. ostinato does not sell your information, use it for advertising, or send it to any other analytics or tracking service.

## data security and retention

your configuration data is managed within a local sqlite database on my host machine. i take reasonable measures to secure the hosting environment, but no computer or service can be guaranteed completely secure.

message text and generated audio are kept in memory only for as long as they are needed for processing and playback. the official host's live dashboard may briefly show text while it is being processed, and technical error messages may appear in local logs. configuration data stays in the database until it is changed, reset, or removed by the operator.

if you run your own instance of ostinato, its operator controls the hosting, logs, backups, and retention practices. this policy only describes the official instance.

## your choices

server administrators can remove ostinato or limit its permissions at any time. you can also use the bot's available settings and reset commands where applicable. if you have a question about data stored by the official instance, please open an issue in the official repository without including private or sensitive information.

## policy updates

i may update this privacy policy from time to time. i will notify you of any changes by updating this document or posting a notice in my official repository.