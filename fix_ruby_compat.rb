# Patch for Ruby 3.2+ compatibility with older Jekyll/Liquid
if !String.method_defined?(:tainted?)
  class Object
    def tainted?
      false
    end
    def taint
      self
    end
    def untaint
      self
    end
  end
end