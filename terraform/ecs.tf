resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${var.project}"
  retention_in_days = 7
}

resource "aws_ecs_cluster" "main" {
  name = "${var.project}-cluster"
}

resource "aws_ecs_task_definition" "api" {
  family                   = "${var.project}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([{
    name  = "api"
    image = "${aws_ecr_repository.api.repository_url}:latest"

    portMappings = [{
      containerPort = 3000
      hostPort      = 3000
      protocol      = "tcp"
    }]

    secrets = [
      {
        name      = "RAILS_MASTER_KEY"
        valueFrom = aws_ssm_parameter.rails_master_key.arn
      },
      {
        name      = "DATABASE_URL"
        valueFrom = aws_ssm_parameter.database_url.arn
      }
    ]

    environment = [
      {
        name  = "RAILS_ENV"
        value = "production"
      },
      {
        name  = "RAILS_LOG_TO_STDOUT"
        value = "true"
      },
      {
        name  = "FRONTEND_URL"
        value = "https://${aws_cloudfront_distribution.frontend.domain_name}"
      }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/${var.project}"
        "awslogs-region"        = "ap-northeast-1"
        "awslogs-stream-prefix" = "api"
      }
    }
  }])
}

resource "aws_ecs_service" "api" {
  name            = "${var.project}-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  launch_type     = "FARGATE"
  desired_count   = 1

  network_configuration {
    subnets = [
      aws_subnet.public_1.id,
      aws_subnet.public_2.id
    ]
    security_groups  = [aws_security_group.ecs.id]
    # パブリックサブネット配置のためECR・SSM・CloudWatch Logsへの通信に必須
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 3000
  }

  # リスナーより先にサービスを作るとエラーになるため依存関係を明示
  depends_on = [aws_lb_listener.http]

  # task_definitionはGitHub Actionsがデプロイ時に更新するためTerraformの管理外とする
  lifecycle {
    ignore_changes = [task_definition]
  }
}
