// Jenkinsfile — Optional CI/CD Pipeline for ThoughtBox
// This file is provided for educational/viva purposes.
// Requires a Jenkins server with Docker and Python/Node agents configured.

pipeline {
    agent any

    environment {
        DATABASE_URL     = 'sqlite://'
        MODERATOR_SECRET = 'jenkins-test-secret'
        VITE_API_URL     = 'http://localhost:8000'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Backend Tests') {
            steps {
                dir('backend') {
                    sh 'python -m pip install --upgrade pip'
                    sh 'pip install -r requirements.txt'
                    sh 'python -m pytest tests/ -v --tb=short'
                }
            }
        }

        stage('Frontend Build') {
            steps {
                dir('frontend') {
                    sh 'npm ci'
                    sh 'npm run build'
                }
            }
        }

        stage('Docker Build') {
            steps {
                sh 'docker compose build'
            }
        }
    }

    post {
        always {
            echo 'Pipeline completed.'
        }
        failure {
            echo 'Pipeline failed — check the logs above.'
        }
        success {
            echo 'All stages passed successfully!'
        }
    }
}
