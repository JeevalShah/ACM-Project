# URL Shortener Microservice

[![Website](https://img.shields.io/website?down_color=red&down_message=offline&label=website&up_color=brightgreen&up_message=online&url=https%3A%2F%2Facm-project.vercel.app%2F)](https://acm-project.vercel.app/)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-blue)](https://github.com/JeevalShah/ACM-Project)

The URL Shortener Microservice is a web-based application that allows users to shorten URLs with additional features such as custom identifiers, usage restriction, and expiration dates. It provides a simple interface for users to manage and track their shortened URLs.

## Features

- Shortens URLs to create concise and shareable links.
- Offers a user-friendly interface for easy interaction.
- Allows users to choose custom identifiers for their shortened URLs.
- Provides the ability to set a limit on the number of times a shortened URL can be used.
- Supports setting an expiration date and time for the shortened URLs.
- Allows users to view the number of times a shortened URL has been used and the remaining usage count.

## Technologies Used

- HTML
- CSS
- Node.js
- MongoDB Atlas (database)
- Hosted on Vercel

## Dependencies

The following dependencies are required to run the URL Shortener Microservice:

- body-parser
- cors
- dotenv
- express
- fs
- is-url
- mongoose
- node
- qrcode

## Installation and Setup

The URL Shortener Microservice is already hosted online, so there is no need for local installation. You can access it by visiting [https://acm-project.vercel.app/](https://acm-project.vercel.app/).

## Configuration

The microservice requires the following environment variable to be set in the `.env` file:

- `MONGO_URI`: URL to connect to the MongoDB database.

## API Endpoints

- GET `/`: Homepage of the URL Shortener Microservice.
- GET `/use`: Handles redirection when a shortened URL is used.
- POST `/api`: Creates a new shortened URL.

Any other GET request will result in an error page being returned.

## Authentication and Authorization

No authentication or authorization is required to use the URL Shortener Microservice.

## Contribution

Contributions to the development of the URL Shortener Microservice are welcome. You can provide suggestions and improvements by submitting issues and pull requests on the [GitHub repository](https://github.com/JeevalShah/ACM-Project).

## Known Issues and Limitations

- Occasionally, the hosting service may crash and display a 500 serverless function error. Reloading the page or going back usually resolves this issue.

## Author

- Jeeval Shah
  - GitHub: [@JeevalShah](https://github.com/JeevalShah)

## License

This project is licensed under the terms of the MIT License. See the [LICENSE](https://opensource.org/license/mit/) file for more details.

Feel free to explore the URL Shortener Microservice and make use of its features!
