package com.wealthtech.crm.modules.agent.framework;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Enterprise tool declaration annotation adhering to Spring AI's @Tool abstraction pattern.
 * Enables method-level declarative tool exposure without manual schema boilerplate.
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Tool {

    /**
     * Unique function name used by LLM function calling.
     */
    String name() default "";

    /**
     * Natural language description guiding the model on tool invocation semantics.
     */
    String description() default "";

    /**
     * Optional category grouping for tool discovery.
     */
    String category() default "general";
}
