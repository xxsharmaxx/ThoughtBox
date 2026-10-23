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
                    script {
                        if (isUnix()) {
                            sh 'python -m pip install --upgrade pip'
                            sh 'python -m pip install -r requirements.txt'
                            sh 'python -m pytest tests/ -v --tb=short'
                        } else {
                            bat 'python -m pip install --upgrade pip'
                            bat 'python -m pip install -r requirements.txt'
                            bat 'python -m pytest tests/ -v --tb=short'
                        }
                    }
                }
            }
        }

        stage('Frontend Build') {
            steps {
                dir('frontend') {
                    script {
                        if (isUnix()) {
                            sh 'npm ci'
                            sh 'npm run build'
                        } else {
                            bat 'npm ci'
                            bat 'npm run build'
                        }
                    }
                }
            }
        }

        stage('Docker Build') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'docker compose build'
                    } else {
                        withEnv(['PATH+DOCKER=C:\\Users\\DHEERA SHARMA\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin']) {
                            bat 'docker compose up --build'
                        }
                    }
                }
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
