#!/bin/bash

echo "🐰 RabbitMQ Setup Script"
echo "========================"
echo ""

# Start RabbitMQ service
echo "1️⃣  Starting RabbitMQ service..."
brew services start rabbitmq

# Wait for RabbitMQ to start
echo "⏳ Waiting for RabbitMQ to start (10 seconds)..."
sleep 10

# Enable RabbitMQ Management Plugin (for web UI)
echo ""
echo "2️⃣  Enabling RabbitMQ Management Plugin..."
rabbitmq-plugins enable rabbitmq_management

# Check RabbitMQ status
echo ""
echo "3️⃣  Checking RabbitMQ status..."
brew services list | grep rabbitmq

# Display default credentials
echo ""
echo "✅ RabbitMQ is now running!"
echo ""
echo "📋 Default Credentials:"
echo "   Username: guest"
echo "   Password: guest"
echo "   Port: 5672 (AMQP)"
echo "   Management UI: http://localhost:15672"
echo ""

# Optional: Create custom user
read -p "🔐 Do you want to create a custom user? (y/n): " create_user

if [[ $create_user == "y" || $create_user == "Y" ]]; then
    echo ""
    read -p "Enter username: " username
    read -s -p "Enter password: " password
    echo ""
    
    # Create user
    rabbitmqctl add_user "$username" "$password"
    
    # Set user tags (administrator)
    rabbitmqctl set_user_tags "$username" administrator
    
    # Set permissions
    rabbitmqctl set_permissions -p / "$username" ".*" ".*" ".*"
    
    echo ""
    echo "✅ User '$username' created successfully!"
    echo ""
    echo "📝 To use this user, update your configurations:"
    echo ""
    echo "Backend (application.yml):"
    echo "  spring.rabbitmq.username=$username"
    echo "  spring.rabbitmq.password=$password"
    echo ""
    echo "Crawler (src/config.js):"
    echo "  url: 'amqp://$username:$password@localhost:5672'"
    echo ""
    echo "Or set environment variables:"
    echo "  export RABBITMQ_USERNAME=$username"
    echo "  export RABBITMQ_PASSWORD=$password"
fi

echo ""
echo "🎉 RabbitMQ setup complete!"
echo ""
echo "Useful commands:"
echo "  Start:   brew services start rabbitmq"
echo "  Stop:    brew services stop rabbitmq"
echo "  Restart: brew services restart rabbitmq"
echo "  Status:  brew services list | grep rabbitmq"
echo "  Logs:    tail -f /opt/homebrew/var/log/rabbitmq/rabbit@*.log"

